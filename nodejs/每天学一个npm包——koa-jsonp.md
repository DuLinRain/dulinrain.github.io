# 每天学一个npm包——koa-jsonp
这篇文章主要为你讲述[koa-jsonp](https://github.com/kilianc/koa-jsonp/blob/master/lib/jsonp.js)是如何处理`JSONP`请求的，在讲述[koa-jsonp](https://github.com/kilianc/koa-jsonp/blob/master/lib/jsonp.js)具体的实现之前，会先带你回顾一下`JSONP`及其原理。学习完这篇文章后你会对下面几个问题有一些了解：

1. JSONP及其实现原理？
2. JSONP只支持GET吗？
3. JSON的某些优点？
4. 如何对JSONP请求作出响应？

### 一、JSONP及其原理
想必大家肯定都知道`JSONP`请求，我们有时候会用它来实现跨域请求，其原理是通过创建一个` script `标签，将 `src` 设置为目标请求，插入到 `dom` 中，服务器接受该请求并返回数据，跨域请求的响应是一个`js`（即设置`Content-Type: text/javascript`)，数据通常被包裹在回调函数中, 我们需要提前定义好回调函数。

`JSONP`请求的主要优点是：**它不像XMLHttpRequest对象实现的Ajax请求那样受到同源策略的限制；它的兼容性更好，在更加古老的浏览器中都可以运行。**

那它既然是通过插入`script`标签来实现的，那么肯定执行的是`GET`请求。**很多文章也都认为JSONP只能是GET请求**，并且可能大家在实践中用到的也基本上是`GET`，那到底是不是这样呢？

**实际上，JSONP请求也可以是POST请求**。

使用`JSONP`实现跨域`POST`请求实际上需要几个辅助技术(`form` + `iframe`跨域)的支撑:

- form表单
- iframe

我们知道，通过form表单提交数据不会有跨域的限制，其原因可以引用如下来解释：

>因为原页面用` form `提交到另一个域名之后，原页面的脚本无法获取新页面中的内容。所以浏览器认为这是安全的。
>
>而 AJAX 是可以读取响应内容的，因此浏览器不能允许你这样做。
>
>如果你细心的话你会发现，其实请求已经发送出去了，你只是拿不到响应而已。
>
>所以浏览器这个策略的本质是，一个域名的 JS ，在未经允许的情况下，不得读取另一个域名的内容。但浏览器并不阻止你向另一个域名发送请求。
>
>链接：https://www.zhihu.com/question/31592553/answer/190789780

但是上面的说法并不完全正确，通过`form`表单提交后，我们同样是有办法在原页面拿到新页面返回的数据的，这就需要用到`form`的`target`属性一个不太引人注意的值:

![](https://github.com/DuLinRain/pictures/blob/master/form-target.png?raw=true)

也就是说，我们需要创建一个`iframe`(这个`iframe`通常被隐藏起来)，`form`表单的`url`是一个跨域的`JSONP`的接口，并且`form`表单的`target`值是这个`iframe`的名字。

因为我们的`target`指向了这个`iframe`, 所以我们的响应也会吐到这个`iframe`。那么如何拿到数据就是最后剩下的问题了。如何实现呢？

对于有iframe的这种POST情况，我们需要响应的是一个`html`（即设置`Content-Type: text/html`），这个`html`的`<script></script>`脚本里放入`js`, `html`加载时`js`会执行。` js` 内容一般做**2**个事情：

1. 设置`document.domain`为主域
2. 通过`parent.xxx` 调用主域下定义的回调方法

### 二、koa-jsonp的实现
`koa-jsonp`主要用来处理`GET/POST`类型的`jsonp`响应，其实现过程与上面讲述的基本一致，我们可以一起来看一下他的代码：

	return function * _jsonp (next) {
	    yield* next
	
	    let startChunk, endChunk
	    let callback = this.query[callbackName]//检查query中的callbackName
	
	    if (!callback) return
	    if (this.body == null) return
	    //如果是POST请求，则返回html
	    if (this.method === 'POST') {
	      this.type = 'html'
	      startChunk = iframeHtmlTemplate[0] + callback + iframeHtmlTemplate[1]
	      endChunk = iframeHtmlTemplate[2]
	    } else {
	      //如果是GET请求，则返回js
	      this.type = 'text/javascript'
	      startChunk = ';' + callback + '('
	      endChunk = ');'
	    }
	
	    // handle streams
	    if (typeof this.body.pipe === 'function') {
	      this.body = this.body.pipe(new JSONPStream({
	        startChunk: startChunk,
	        endChunk: endChunk
	      }))
	    } else {
	      this.body = startChunk + JSON.stringify(this.body, null, this.app.jsonSpaces) + endChunk
	    }
	  }

上面的代码可以简单解释一下，

最开始会检查我们`query`中指定的`callbackName`, 默认会是`callback`，如果没有则不做进一步处理：

	let callbackName = options.callbackName || 'callback'
	...
	let callback = this.query[callbackName]

	if (!callback) return

然后会检查`JSONP`请求的的类型，如果是`POST`，则会组装`html`，返回：

	  let domain = options.domain || '.default.lan'
	 
	  let iframeHtmlTemplate = [
	    '<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html charset=utf-8"/><script type="text/javascript">document.domain = "' + domain + '";parent.',
	    '(',
	    ');</script></head><body></body></html>'
	  ]
	  ...
	  if (this.method === 'POST') {
	      this.type = 'html'
	      startChunk = iframeHtmlTemplate[0] + callback + iframeHtmlTemplate[1]
	      endChunk = iframeHtmlTemplate[2]
	  } else {
	      ...
	  }	
	  
可以看到，和我们上面讲述的类似，是返回的一个`html`，

	this.type = 'html'

然后在`html`的`js`脚本里指定了`domain`以及使用`parent.youcallbackName()`来执行父页面定义的函数。

>实际上这种情况返回的内容并不需要是一个完整的html, 只有`<script>xxxx</script>`这一段也是可以的。

如果是`GET`请求的话，就没有这么多步骤，比较简单的返回一个`js`代码，代码中执行`youcallbackName()`：

      this.type = 'text/javascript'
      startChunk = ';' + callback + '('
      endChunk = ');'

而返回数据的组装则放在两个括号之间，数据通过`JSON.stringify`进行序列化：

	this.body = startChunk + JSON.stringify(this.body, null, this.app.jsonSpaces) + endChunk

### 三、需要注意点
从上面的代码可以看出，服务端给给`JSONP`的响应数据是通过`JSON`序列化后的`JSON`字符串，遵循`JSON`规范。而客户端解析(反序列化)是通过浏览器进行解析的，浏览器解析的时候遵循的是`ECMA-262`规范。而`\n `和 `\r` 这两个字符恰好在两种规范中不一致，可能会导致出现问题。具体可参考：

>I just discovered a "bug" in JSON:
>
>JSON is not a true subset of JavaScript because of two tiny whitespace unicode characters: U+2028 and U+2029. In ECMA-262 they are defined as "Line Terminator Characters" (see 7.3 Line Terminator) and are therefore equivalent of \n and \r. That means they are not valid in the middle of a string.
>
>According to JSON U+2029 and U+2029 are just two regular Unicode characters and are therefore valid in the middle of a string. This is usually not a problem as long as you use a proper JSON parser, but in the case of JSONP the browser is the JSON parser.
>
>https://github.com/rack/rack-contrib/pull/37

因此，为了更稳妥起见(虽然经过实测很可能没必要)，我们需要对返回给浏览器的响应做一下转义：

	// JSON parse vs eval fix. https://github.com/rack/rack-contrib/pull/37
	this.body = this.body
	.replace(/\u2028/g, '\\u2028')
	.replace(/\u2029/g, '\\u2029')

### 四、示例

#### 4.1 GET

	<!doctype html>
	<html>    
	    <script>
	        window.testCallback = function (result) {
	            console.log('result', result)
	        }
	    </script>
	    <script src="http://127.0.0.1:3333/jsonp-get?callback=testCallback"></script>
	</html>

#### 4.2 POST

	<!doctype html>
	<html>
	    <script>
	        window.testCallback = function (result) {
	            console.log('result', result)
	        }
	    </script>
	    <iframe name="testiframe" style="display:none"></iframe>
	    <form method="POST" action="http://a.test.com/jsonp-post?callback=testCallback" target="testiframe">
	        <input name="test"/>
	        <button type="submit">提交</button>
	    </form>
	</html>
