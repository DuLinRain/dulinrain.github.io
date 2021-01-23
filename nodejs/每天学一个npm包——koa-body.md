# 每天学一个npm包——koa-body

在用koa搭建node服务的时候，通常我们都会使用[koa-body](https://github.com/dlau/koa-body/blob/master/index.js)对`http`请求体进行解析，最终会将`body`提取出来放在`ctx.request.body`或`ctx.req.body`上。[koa-body](https://github.com/dlau/koa-body/blob/master/index.js)能够处理`multipart/form-data`、`application/x-www-urlencoded`、`application/json`等几种常见的`Content-Type`。而由于`multipart/form-data`类型具有一定的特殊性，所以[koa-body](https://github.com/dlau/koa-body/blob/master/index.js)在解析`body`时，实际上是把整个解析流程根据`Content-Type`分成了2大类，其整体的流程如下：

![](https://github.com/DuLinRain/pictures/blob/master/koa-body.png?raw=true)

从图中可以清晰的看出[koa-body](https://github.com/dlau/koa-body/blob/master/index.js)koa-body的作用，他对Content-Type的常规类型和文件分别解析，解析后内容放到ctx上。
对常规类型的解析，使用的是 [co-body](https://github.com/cojs/co-body), 而对于文件，采用的是[formidable](https://github.com/node-formidable/node-formidable)。`co-body`依赖于[raw-body](https://github.com/stream-utils/raw-body) 和[inflation](https://www.npmjs.com/package/inflation)。

实际上，为了能全面了解`koa-body`整个上层与底层的实现过程，我们已经在前面几篇文章分别学习过在整个流程中`koa-body`所依赖的主要模块，感兴趣的可以参考：

- 每天学一个npm包——inflation
- 每天学一个npm包——raw-body
- 每天学一个npm包——co-body

本篇文章是作为`koa-body`系列的收尾篇，在前述几个依赖的基础上讲解`koa-body`的实现。有了前面几篇文章的基础，`koa-body`的实现看起来非常清晰明了。

### koa-body源码分析

	return function (ctx, next) {
	    var bodyPromise;
	    // only parse the body on specifically chosen methods
	    if (opts.parsedMethods.includes(ctx.method.toUpperCase())) {
	      try {
	      	  // 处理Content-Type: application/json
	        if (opts.json && ctx.is(jsonTypes)) {
	          bodyPromise = buddy.json(ctx, {
	            encoding: opts.encoding,
	            limit: opts.jsonLimit,
	            strict: opts.jsonStrict,
	            returnRawBody: opts.includeUnparsed
	          });
	          // 处理Content-Type: application/x-www-urlencoded
	        } else if (opts.urlencoded && ctx.is('urlencoded')) {	          bodyPromise = buddy.form(ctx, {
	            encoding: opts.encoding,
	            limit: opts.formLimit,
	            queryString: opts.queryString,
	            returnRawBody: opts.includeUnparsed
	          });
	        } else if (opts.text && ctx.is('text')) {// 处理Content-Type: text/plain
	          bodyPromise = buddy.text(ctx, {
	            encoding: opts.encoding,
	            limit: opts.textLimit,
	            returnRawBody: opts.includeUnparsed
	          });
	          // 处理Content-Type: multipart/form-data	        } else if (opts.multipart && ctx.is('multipart')) {
	          bodyPromise = formy(ctx, opts.formidable);
	        }
	      } catch (parsingError) {
	        if (typeof opts.onError === 'function') {
	          opts.onError(parsingError, ctx);
	        } else {
	          throw parsingError;
	        }
	      }
	    }
	    
上面这段源码就是`koa-body`功能的主要逻辑，它会根据`Content-Type`的类型来决定采用哪个依赖包来解析http协议的body, 其得到的是一个Promise, 而这个Promise执行完后会在`ctx`上挂载对应的字段：


	bodyPromise = bodyPromise || Promise.resolve({});
	    return bodyPromise.catch(function(parsingError) {
	      if (typeof opts.onError === 'function') {
	        opts.onError(parsingError, ctx);
	      } else {
	        throw parsingError;
	      }
	      return next();
	    })
	    .then(function(body) {
	      if (opts.patchNode) {
	        // 处理Content-Type: multipart/form-data
	        if (isMultiPart(ctx, opts)) {
	          ctx.req.body = body.fields;
	          ctx.req.files = body.files;
	        } else if (opts.includeUnparsed) {
	          ctx.req.body = body.parsed || {};
	          if (! ctx.is('text')) {
	            ctx.req.body[symbolUnparsed] = body.raw;
	          }
	        } else {
	          ctx.req.body = body;
	        }
	      }
	      if (opts.patchKoa) {
	        // 处理Content-Type: multipart/form-data
	        if (isMultiPart(ctx, opts)) {
	          ctx.request.body = body.fields;
	          ctx.request.files = body.files;
	        } else if (opts.includeUnparsed) {
	          ctx.request.body = body.parsed || {};
	          if (! ctx.is('text')) {
	            ctx.request.body[symbolUnparsed] = body.raw;
	          }
	        } else {
	          ctx.request.body = body;
	        }
	      }
	      return next();
	    })
	    
这里可以看到，对于常规的`Content-Type`类型，就是把解析的结果挂载在`ctx.request.body` 上， 对于`Content-Type`类型为`multipart/form-data`时，由于我们用`FormData`或者用表单形式上传文件的时候是可以上传除文件之外的其它字段的，所以对于文件既有`ctx.request.files`也有`ctx.request.body`。

### 结论
 相信你在读完这些文章之后对http请求进入到node之后的处理流程有了很清晰的认识，同时对`koa-body`, `co-body`, `raw-body`的关系也搞得更加清楚了。