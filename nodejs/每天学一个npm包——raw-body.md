# 每天学一个npm包——raw-body
在学习[raw-body](https://github.com/stream-utils/raw-body)之前，我们先回顾一下`http`流的传输过程，客户端向服务端发送请求，这个请求头里会带有`Content-Type`，用于标识我们的内容的类型，以及`Content-Encoding`，用于标识我们的消息体的压缩编码方式。

服务端在收到请求流后，根据根据`Content-Type`的类型来决定按文件解析还是按text/form/json等格式解析。在koa-body的实现里，如果是文件类型，则通过formidable来处理，如果是text/form/json等类型，则通过[co-body](https://github.com/cojs/co-body)来处理。而[co-body](https://github.com/cojs/co-body)实际上依赖的是[raw-body](https://github.com/stream-utils/raw-body)。我们这篇文章主要讨论的是text/form/json等类型的场景。

在koa-body里，当收到text/form/json等类型的请求时，首先第一步是针对`Content-Encoding`类型，采用[inflation](https://www.npmjs.com/package/inflation)包先对流进行解压缩(详见每天学一个npm包——inflation)，完了之后的下一步，就是需要对这个流进行消费。 在`koa-body`中，对流的消费实际上是通过`raw-body`来完成的，消费完后得到的是一个`Buffer`或者`string`，从而供后续的流程得到对应形式(如`text`,` json`等)的数据。

[raw-body](https://github.com/stream-utils/raw-body)在整个流程中的位置如下：


![raw-body](https://github.com/DuLinRain/pictures/blob/master/raw-body.png?raw=true)
 
`raw-body`的角色了解之后，我们可以来看一下它的实现。**消费流，顾名思义，就是监听流的各种事件，接收流的数据。**用法比较简单，其示例代码如下：

	var contentType = require('content-type')
	var express = require('express')
	var getRawBody = require('raw-body')
	
	var app = express()
	
	app.use(function (req, res, next) {
	  getRawBody(req, {
	    length: req.headers['content-length'],
	    limit: '1mb',
	    encoding: contentType.parse(req).parameters.charset
	  }, function (err, string) {
	    if (err) return next(err)
	    req.text = string
	    next()
	  })
	})

我们可以根据文档说明来对照看一下代码实现。
 
 `raw-body`只提供了一个API，如下：
 
 	getRawBody(stream, [options], [callback])
 
### callback
如果调用时没有提供`callback`并且存在全局的`Promise`可以使用，那么返回的将会是一个`Promise`.  否则如果提供了`callback`，那么会执行这个`callback`。这个我们可以从它的实现代码中对照看出：

	function getRawBody (stream, options, callback) {
	  var done = callback
	  ...
	  // validate callback is a function, if provided
	  if (done !== undefined && typeof done !== 'function') {
	    throw new TypeError('argument callback must be a function')
	  }
	
	  // require the callback without promises
	  // 如果callback不存在 && 没有全局Promise
	  if (!done && !global.Promise) {
	    throw new TypeError('argument callback is required')
	  }
	  ...
	  //如果提供了callback
	  if (done) {
	    // classic callback style
	    return readStream(stream, encoding, length, limit, done)
	  }
	  //如果没有提供callback
	  return new Promise(function executor (resolve, reject) {
	    readStream(stream, encoding, length, limit, function onRead (err, buf) {
	      if (err) return reject(err)
	      resolve(buf)
	    })
	  })
	}

### options
`options`是个可选的参数，支持`string`和`object`两种形式，`string`的话就只能指定`encoding`方式，`object`的化可以指定`length`,` limit`, `encoding`三个参数。

	if (options === true || typeof options === 'string') {
	    // short cut for encoding
	    opts = {
	      encoding: options//string的话就只能指定encoding方式
	    }
	  }

他们的含义分别如下：

#### length
`length.` 表示流的大小，也就是`Content-Length`的大小。如果流的数据加起来不等于`Content-Length`指定的值，那么会返回400的http错误(通过http-errors包实现的，详见[每天学一个node包——http-errors](https://mp.weixin.qq.com/s/-WEiHfo0PTJYOwf8p8nJeQ))。

这块逻辑我们可以在代码中的`onEnd`函数看到：

	function onEnd (err) {
	    if (complete) return
	    if (err) return done(err)
	
	    if (length !== null && received !== length) {
	      done(createError(400, 'request size did not match content length', {
	        expected: length,
	        length: length,
	        received: received,
	        type: 'request.size.invalid'
	      }))
	    } else {
	      var string = decoder
	        ? buffer + (decoder.end() || '')
	        : Buffer.concat(buffer)
	      done(null, string)
	    }
	  }


#### limit
`limit.` 表示消息体的大小限制。 如果实际消息体的大小超过`limit`的值，那么将会返回`413`的http错误。这块逻辑可以在`ReadStream`以及`onData`中看到：

	function readStream (stream, encoding, length, limit, callback) {
	  var complete = false
	  var sync = true
	
	  // check the length and limit options.
	  // note: we intentionally leave the stream paused,
	  // so users should handle the stream themselves.
	  if (limit !== null && length !== null && length > limit) {
	    return done(createError(413, 'request entity too large', {
	      expected: length,
	      length: length,
	      limit: limit,
	      type: 'entity.too.large'
	    }))
	  }
	  ...
	}
	
	function onData (chunk) {
	    if (complete) return
	
	    received += chunk.length
	
	    if (limit !== null && received > limit) {
	      done(createError(413, 'request entity too large', {
	        limit: limit,
	        received: received,
	        type: 'entity.too.large'
	      }))
	    } else if (decoder) {
	      buffer += decoder.write(chunk)
	    } else {
	      buffer.push(chunk)
	    }
	  }

`limit`的取值可以是数字，也可以是类似`1000`, `500kb` 或 `3mb` 的字符串。将类似的字符串转换成数字是通过[bytes](https://www.npmjs.com/package/bytes)这个包来完成的，如下：

	// convert the limit to an integer
	  var limit = bytes.parse(opts.limit)
	  
[bytes](https://www.npmjs.com/package/bytes)提供了它们之间互相转换的方法，我们如果在别的项目中有需要可以直接拿来用或者参考改改。

#### encoding
`encoding`用来指定将`buffer`形式的`body`转换成字符串的编码方式。如果不指定`encoding`，则会返回`Buffer`。如下：

	function onEnd (err) {
	    if (complete) return
	    if (err) return done(err)
	    if (length !== null && received !== length) {
	      ...
	    } else {
	    	//返回buffer或string
	      var string = decoder
	        ? buffer + (decoder.end() || '')
	        : Buffer.concat(buffer)
	      done(null, string)
	    }
	  }

如果指定`encoding`为`true`,则会用`utf-8`编码将`Buffer`转成`String`, 如下：

	// get encoding
	  var encoding = opts.encoding !== true
	    ? opts.encoding
	    : 'utf-8'

如果指定了合法的其它`encoding`值，则会用对应的编码方式将`Buffer`转成`String`。如下

	function onData (chunk) {
	    if (complete) return
	
	    received += chunk.length
	
	    if (limit !== null && received > limit) {
	      ...
	    } else if (decoder) {//指定了合法的encoding
	      buffer += decoder.write(chunk)
	    } else {//未指定encoding
	      buffer.push(chunk)
	    }
	  }

合不合法主要根据 [iconv-lite](https://github.com/ashtuchkin/iconv-lite) 这个包支不支持来判断。如下：
	
	function getDecoder (encoding) {
	  if (!encoding) return null
	
	  try {
	    return iconv.getDecoder(encoding)
	  } catch (e) {
	    // error getting decoder
	    if (!ICONV_ENCODING_MESSAGE_REGEXP.test(e.message)) throw e
	
	    // the encoding was not found
	    throw createError(415, 'specified encoding unsupported', {
	      encoding: encoding,
	      type: 'encoding.unsupported'
	    })
	  }
	}


      try {
	    decoder = getDecoder(encoding)
	  } catch (err) {
	    return done(err)
	  }
	
	  var buffer = decoder ? '' : []

### 错误处理
一旦这个过程发生任何错误，流将会被暂停，流的所有内容将被`unpiped`, 你需要负责正确的处理流，对于`HTTP`请求而言，如果你做了响应，那么无需做其它额外的事情。如果是使用了文件描述符之类的流的话，你需要调用`stream.destroy()` 或 `stream.close()`之类的来防止内存泄漏。我们可以对照代码实现来看一下：

	function invokeCallback () {
		  cleanup()
			
		  if (args[0]) {
		    // halt the stream on error
		    halt(stream)
		  }
			
		  callback.apply(null, args)
	}
	
	
	function halt (stream) {
	  // unpipe everything from the stream
	  unpipe(stream)
	
	  // pause stream
	  if (typeof stream.pause === 'function') {
	    stream.pause()
	  }
	}
