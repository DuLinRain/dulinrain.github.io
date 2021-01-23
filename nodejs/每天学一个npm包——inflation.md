# 每天学一个npm包——inflation
在学习[inflation](https://www.npmjs.com/package/inflation)之前，我们先回顾一下http流的传输过程，客户端向服务端发送请求，这个请求头里会带有`Content-Type`，用于标识我们的内容的类型，以及`Content-Encoding`，用于标识我们的消息体的压缩编码方式。其具体的含义如下：

>Content-Encoding 是一个实体消息首部，用于对特定媒体类型的数据进行压缩。当这个首部出现的时候，它的值表示消息主体进行了何种方式的内容编码转换。这个消息首部用来告知客户端应该怎样解码才能获取在 Content-Type 中标示的媒体类型内容。

>一般建议对数据尽可能地进行压缩，因此才有了这个消息首部的出现。不过对于特定类型的文件来说，比如jpeg图片文件，已经是进行过压缩的了。有时候再次进行额外的压缩无助于负载体积的减小，反而有可能会使其增大。

`Content-Encoding`的取值通常有如下几种：

- gzip
- compress
- deflate
- identity
- br

其中只有`identity`表示未经压缩编码。

我们在平时遇到的基本上是`gzip`, `compress`, `deflate`几种。

服务端在收到请求流后，根据根据`Content-Type`的类型来决定按文件解析还是按text/form/json等格式解析。在koa-body的实现里，如果请求是文件类型，则通过[formidable](https://github.com/node-formidable/node-formidable)来处理，如果是text/form/json等类型，则通过[co-body](https://github.com/cojs/co-body)来处理。这里我们以text/form/json等类型的请求来讲述。

那么在我们使用`node`的`http.createServer`创建一个服务，收到一个请求后，我们需要怎么处理得到请求中的数据呢？

很显然，我们要做的**第一步**就是根据`Content-Encoding`的类型来对请求流进行**解压缩**。请求过来后，`http.createServer`给我们的`req`参数实际上就是一个流，我们需要对其解压缩后传给下一级处理。 而这就恰恰是[inflation](https://www.npmjs.com/package/inflation)这个包所做的工作。

[inflation](https://www.npmjs.com/package/inflation)的实现如下，他的功能是：

>从给定的流返回解压缩后的流数据

	var zlib = require('zlib')
	
	module.exports = inflate
	
	function inflate(stream, options) {
	  if (!stream) {
	    throw new TypeError('argument stream is required')
	  }
	
	  options = options || {}
	
	  var encoding = options.encoding
	    || (stream.headers && stream.headers['content-encoding'])
	    || 'identity' //判断压缩类型，如果没有则认为未压缩
	
	  switch (encoding) {
	  case 'gzip':
	  case 'deflate':
	    break
	  case 'identity':
	    return stream //未压缩的话，直接返回原始的流
	  default:
	    var err = new Error('Unsupported Content-Encoding: ' + encoding)
	    err.status = 415//不支持的Content-Encoding返回415
	    throw err
	  }
	
	  // no not pass-through encoding
	  delete options.encoding
	
	  return stream.pipe(zlib.Unzip(options))//解压
	}

`koa`里面解析不同`Content-Type`请求使用的通常是`koa-body`中间件，`koa-body`里面最底层使用的也是`inflation`这个包。其在整个流程中所处的位置如下：

![koa-body整体流程](https://github.com/DuLinRain/pictures/blob/master/inflation.png?raw=true)

我们后续在讲述`koa-body`的时候会详细讲述。

关于`Content-Encoding`的更多细节可参考[Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding)



	
