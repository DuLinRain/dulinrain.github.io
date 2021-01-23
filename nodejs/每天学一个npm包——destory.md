# 每天学习一个npm包——destory
destroy包用于确保销毁一个流，它将不同流的API做了封装并且hack了一个Node.js本身的bug。koa中使用它处理http响应Content-Type是Buffer的情形。

### 一、 用法
它的用法如下：

	var destroy = require('destroy')
	
	// ... and later
	destroy(stream)
	
这里的stream可以是一个文件流或其他流，大多数情况下，<code>destroy(stream)</code>等同于<code>stream.destroy()</code>，但是并不全是。 它具体的规则如下：

- 如果<code>stream</code>是<code>ReadStream</code>的实例，那么调用<code>destroy(stream)</code>方法实际上是先调用<code>stream.destroy()</code>方法，然后监听流的open事件，并在open事件触发后执行<code>stream.close()</code>方法。
- 如果stream不是Stream的实例，那么什么都不会发生
- 如果stream自身有.destroy()方法，那么执行该方法

### 二、 实现
destory的实现和上述完全一致：

	/**
	 * Destroy a stream.
	 *
	 * @param {object} stream
	 * @public
	 */
	
	function destroy (stream) {
	  if (stream instanceof ReadStream) { //情况1：如果参数stream是ReadStream
	    return destroyReadStream(stream)
	  }
	
	  if (!(stream instanceof Stream)) {//情况2：如果参数stream不是Stream实例
	    return stream
	  }
	
	  if (typeof stream.destroy === 'function') {//情况3：如果参数stream自身有destroy方法
	    stream.destroy()
	  }
	
	  return stream
	}

其中，destroyReadStream定义如下：

	/**
	 * Destroy a ReadStream.
	 *
	 * @param {object} stream
	 * @private
	 */
	
	function destroyReadStream (stream) {
	  stream.destroy()
	
	  if (typeof stream.close === 'function') {
	    // node.js core bug work-around hack Nodejs的bug
	    stream.on('open', onOpenClose)
	  }
	
	  return stream
	}
	
其中，onOpenClose定义如下：

	/**
	 * On open handler to close stream.
	 * @private
	 */
	
	function onOpenClose () {
	  if (typeof this.fd === 'number') {
	    // actually close down the fd
	    this.close()
	  }
	}



	
