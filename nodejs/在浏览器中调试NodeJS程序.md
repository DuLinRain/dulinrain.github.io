# 在浏览器中调试NodeJS程序
我们在调试前端代码的时候通常可以在浏览器中打断点，单步运行等等方便地进行调试代码，但是当我们在调试NodeJS的时候却不是很好办到。而采用最原始的console.log形式进行调试又很麻烦。所以，可否像调试前端代码一样在浏览器中调试Node代码呢？下面介绍2种调试方式。


### 一、V8 Inspector Integration for Node.js
**V8 Inspector Integration** 允许我们在浏览器的Devtool中调试NodeJS代码，它内部使用的是**Chrome DevTools Protocol**。

启用**V8 Inspector Integration** 非常简单，我们只需要在启动应用的时候加上`--inspect`即可。这样调试器会启用一个默认的`websocket`端口和`Devtool`建立连接：

	node --inspect=9229 index.js
	
以下面这个例子为例：

	const Koa = require('koa');
	const app = new Koa();
	var Router = require('koa-router');
	 
	var router = new Router();
	 
	router.get('/', (ctx, next) => {
	    ctx.body = 'Hello World';
	});
	router.get('/test', (ctx, next) => {
	    ctx.body = 'Hello World test';
	}); 
	app
	  .use(router.routes())
	  .use(router.allowedMethods());
	
	app.listen(3001);
	
这是一个非常简单的koa服务，监听3001端口的请求，我们在控制台输入：

	node --inspect=9229 index.js
	
启动服务后，可以在控制台发现如下输出：

	yulinyulin$ node --inspect=9229 index.js
	Debugger listening on ws://127.0.0.1:9229/0b23a9cb-b6c7-4c51-9d5f-077bf83afbcc
	For help, see: https://nodejs.org/en/docs/inspector
	Debugger attached.
	Debugger listening on ws://127.0.0.1:9229/0b23a9cb-b6c7-4c51-9d5f-077bf83afbcc
	For help, see: https://nodejs.org/en/docs/inspector
	
现在，我们在浏览器输入http://127.0.0.1:3001/并且打开浏览器控制台可以看到如下内容：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnT9XgRSkatLYYmDVmo2pC2fyzL0NXO9K3KiaAPMM4zXrNwhiajOONpbsU65nJiae5zfhHaLY8b1B4Bg/0?wx_fmt=png)

在控制台左下角有一个明显的Node图标，表明我们的服务已经和Devtool建立了调试的关系。点一下这个图标我们可以看到熟悉的Devtool调试界面：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnT9XgRSkatLYYmDVmo2pC2wVEfdibjicUOykPgWYQzzMH8oY8FDo8Yc4vstj9VC5cWgB3thjdxp9RQ/0?wx_fmt=png)

我们可以设置断点进行调试，比如我们在/test路由里设置了一个断点，任何/test的请求都会进入到断点出：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnT9XgRSkatLYYmDVmo2pC29viaIQ8xwWemcHdt9IudzaY5aS0BSDqJR73kIbaPT3WJb8OmP7MpRRw/0?wx_fmt=png)

我们可以在devtool里打印、查看变量，也可以进行单步调试等等。

V8 Inspector Integration for Node.js使得Node原生的debugger和Devtool之间建立了联系，方便我们进行本地调试开发，更多NodeJS debugger的信息可以查看：<a href="https://nodejs.org/docs/latest/api/debugger.html">debugger</a>

### 二、ndb
<a href="https://github.com/GoogleChromeLabs/ndb"> ndb </a>是Google Chrome实验室开源的一款Node调试工具，它内部依赖于Puppeteer，也可以让我们方便的在浏览器中调试web程序。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnT9XgRSkatLYYmDVmo2pC2GJn2f4DQVicrs6dnLibrZGDya0QNuMwz7Os0Z0XlZKBdJw2a2RIC9ibJA/0?wx_fmt=png)

它的使用方法非常简单，只需要先全局安装：

	npm install -g ndb
	
然后同样以上述代码为例，启用调试只需要执行：

	ndb node index.js
	
启用ndb后会自动弹出类似于devtool的一个界面：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnT9XgRSkatLYYmDVmo2pC2swcK9duDpxgBaDicDfwE3jSa8Zy0tgduNhtCIMQYEwvH4KVA24bWaOw/0?wx_fmt=png)

我们同样可以查看变量，设置断点，查看堆栈等等：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnT9XgRSkatLYYmDVmo2pC2C6nE4Pu5SOFXsKiaXbDzjmxWvibHEHfptNjibvQnvVG9icdguqD2mPrdgA/0?wx_fmt=png)