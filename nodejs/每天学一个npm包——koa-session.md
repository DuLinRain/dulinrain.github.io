# 每天学一个npm包——koa-session
在前面的几篇文章中，我们已经介绍了一个`http`请求走到服务端时，服务端第一步所做的事情。接下来，本文将会讲述**session**以及其在`koa`中的具体实现。学完本文之后，你可能会对以下知识点有一些认识：

 - Cookie的存储限制是多少？
 - 什么是session?
 - session和cookie有什么区别？
 - koa-session是如何识别用户的？
 - 会话固定攻击（session fixation attack）
 - koa-session的源码实现

**session并没有一个标准的协议约定**，所以`session`的实现也是开放式的。了解`koa-session`的实现原理一方面可以帮助我们更加理解`cookie`、`session`以及`HTTP会话跟踪`，同时对于我们自己实现`session`具有一定的启发意义。不仅如此，有些其他的web功能也是可以基于`session`来实现的，比如[koa-csrf](https://github.com/koajs/csrf)的实现就基于[koa-session](https://github.com/koajs/session)。

### 一、 什么是session?
提起**session**，就不得不提**cookie**。Cookie在[RFC6265](https://www.ietf.org/rfc/rfc6265.html)中是有完整的协议约定的——**HTTP State Management Mechanism**。简而言之，在客户端第一次请求服务端的时候，服务端通过HTTP的`Set-Cookie`响应头向客户端种下一些信息，这个信息就叫Cookie。在随后的请求中，客户端会将Cookie通过HTTP的Cookie请求头带回给服务端。这样就在无状态的HTTP协议上建立起了一个状态追踪的方式。

但Cookie的存储量是有限制，[RFC6265](https://www.ietf.org/rfc/rfc6265.html) 中规定了客户端实现中对Cookie在**单个cookie大小、单域名下cookie个数、总cookie个数的最小约束**：

> 1. 每个cookie的最小大小是**4096字节**（即**4K**，这个长度包括cookie的name, value以及所有属性）。
> 2. 每个域名下至少可存储 **50** 个cookie。
> 3. 一共可以存储至少**3000**个cookie。

当然，[RFC6265](https://www.ietf.org/rfc/rfc6265.html) 是在2011年制定的，最早的关于Cookie的协议规范是2000年制定的 [RFC2965](https://www.ietf.org/rfc/rfc2965) 规范，在该规范中，规定的客户端实现中对Cookie在**单个cookie大小、单域名下cookie个数、总cookie个数的最小约束**的实现如下：

> 1. 每个cookie的最小大小是**4096字节**（即**4K**，这个长度包括cookie的name, value以及所有属性）。
> 2. 每个域名下至少可存储 **20** 个cookie。
> 3. 一共可以存储至少**300**个cookie。

所以，`RFC`只是对客户端实现做了最低的规定，并且存在`RFC6265`和`RFC2965`两个新旧版本，可以想象不同平台以及不同时期的浏览器（客户端实现）对Cookie的限制也是不一样的，想了解具体的情况和测试方法的可以参考[不同浏览器对cookie长度的限制](http://browsercookielimits.squawky.net/)。

当然，除了大小的限制，Cookie存储在客户端还有其它一些可能危害安全的一些问题，所以在[RFC6265——Session Identifiers](https://www.ietf.org/rfc/rfc6265.html#page-31) 中有这样一小节：

> 服务器通常不是将会话信息直接存储在cookie中（可能会暴露给攻击者或者被黑客破解），而是通常将随机数（或“会话标识符”）存储在cookie中。 当服务器接收到带有随机数的HTTP请求时，服务器可以使用该随机数作为key来查找该cookie关联的状态信息。
> 
> 使用会话标识符cookie限制了攻击者通过学习cookie内容可能造成的损害，因为随机数仅用于与服务器交互（不同于非随机的cookie内容，后者可能很敏感）
> 
> Instead of storing session information directly in a cookie (where it might be exposed to or replayed by an attacker), servers commonly store a nonce (or "session identifier") in a cookie.  When the server receives an HTTP request with a nonce, the server can look up state information associated with the cookie using the nonce as a key.
> 
> Using session identifier cookies limits the damage an attacker can cause if the attacker learns the contents of a cookie because the nonce is useful only for interacting with the server (unlike non-nonce cookie content, which might itself be sensitive).
> 

所以，从上述内容可以看出，我们**平常所说的session，通常指的是一种比Cookie更加安全的会话跟踪手段，它同样需要借助cookie来实现**。

而具体根据实际实现来说的话，通常又可以将session分解为`session_id`和`session内容`。`session_id`是存在客户端中的一个`cookie`的`name`，`session内容`则是该`session_id`对应的`会话内容`。`session内容`通常是存储在服务端的，可以存储在**内存**、**redis**以及**mysql等**数据库中，但是`session内容`同样是可以作为`session_id`的值存储在`cookie`中的，协议并没有强制规定它的存储实现。而**实际上koa-session的默认实现就是如此**！

### 二、koa-session是如何跟踪用户的？
在koa-session的README里有下面这个使用示例：

	const session = require('koa-session');
	const Koa = require('koa');
	const app = new Koa();
	
	app.keys = ['some secret hurr'];
	
	const CONFIG = {
	  key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
	  /** (number || 'session') maxAge in ms (default is 1 days) */
	  /** 'session' will result in a cookie that expires when session/browser is closed */
	  /** Warning: If a session cookie is stolen, this cookie will never expire */
	  maxAge: 86400000,
	  autoCommit: true, /** (boolean) automatically commit headers (default true) */
	  overwrite: true, /** (boolean) can overwrite or not (default true) */
	  httpOnly: true, /** (boolean) httpOnly or not (default true) */
	  signed: true, /** (boolean) signed or not (default true) */
	  rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
	  renew: false, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
	  sameSite: null, /** (string) session cookie sameSite options (default null, don't set it) */
	};
	
	app.use(session(CONFIG, app));
	// or if you prefer all default config, just use => app.use(session(app));
	
	app.use(ctx => {
	  // ignore favicon
	  if (ctx.path === '/favicon.ico') return;
	
	  let n = ctx.session.views || 0;
	  ctx.session.views = ++n;
	  ctx.body = n + ' views';
	});
	
	app.listen(3333);
	console.log('listening on port 3333');
	
启动后，每刷新一次页面，页面上的数字就会**+1**，同时我们可以在cookie列表中看到种下了2个cookie:

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkhfaRUFcBkcxhybH2csjWNOaH9h4lHfV1ibeoN1WELlqy4FD2ufqSrVvqFicuHfUexKdFxaKvTKWVg/0?wx_fmt=png)

这是很正常的现象，虽然我们没使用持续存储的数据库，但你可能觉得这个数字存储在服务端内存中，每次请求过去，服务端根据这个id（即session_id）去查询该cookie对应的会话内容。但是当我们把**服务器重启后，你会发现这个数字并没有归零，而是在前一次访问的基础上继续增加**。这又是为啥呢？

>注意：我们并没有使用任何数据库作为存储，也没有其它的cookie。理论上，存储在服务端的内存的话，重启后内容会丢失。

实际上，正如前面提到的，koa-session的**默认实现并没有将会话内容放在服务端存储，而是将其放在session_id对应的value中存储**。也就是说，**还是存放在cookie中**。

当然，这只是说koa-session的默认实现如此，实际上koa-session还支持其它很多中自定义的外部存储的实现：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkhfaRUFcBkcxhybH2csjWNWIMAuxgQ3tcF8jI9hHicFDXrHVxUrRs8Bnley1cEOE9oGnEib3TvQMCg/0?wx_fmt=png)

**那么, `SESSION_ID`的value一般是固定不变的吗？SESSION_ID该怎么生成？**

实际上，同样拿上面那个例子来看，每次刷新后，SESSION_ID的值都不一样，比如：

	eyJ2aWV3cyI6NiwiX2V4cGlyZSI6MTU4MjU0NTM1MjA1OCwiX21heEFnZSI6ODY0MDAwMDB9
	eyJ2aWV3cyI6NywiX2V4cGlyZSI6MTU4MjU0NTM3NzkxMywiX21heEFnZSI6ODY0MDAwMDB9

可以看到头和尾基本不变，但是中间的部分是不一样的。

实际上，由于我们前面说了，koa-session的默认实现会把会话内容存放在value中，由于我们这里的会话内容(主要是数值+1)每次都变，所以这里的value肯定也会不一样。但是如果我们把会话内容存放在服务端，SESSION_ID可以保持不变吗？

答案还是：**不行**。

因为**`SESSION_ID`的生成也是有技巧的，固定不变的`SESSION_ID` 可能会导致会话固定攻击（session fixation attack）漏洞。这个在RFC中也有提到**：

> Using session identifiers is not without risk.  For example, the server SHOULD take care to avoid "session fixation" vulnerabilities. A session fixation attack proceeds in three steps.  First, the attacker transplants a session identifier from his or her user agent to the victim's user agent.  Second, the victim uses that session identifier to interact with the server, possibly imbuing the session identifier with the user's credentials or confidential information. Third, the attacker uses the session identifier to interact with server directly, possibly obtaining the user's authority or confidential information.
> 
> 详细分析可参考[漏洞：会话固定攻击（session fixation attack）](https://www.jianshu.com/p/a5ed607cb48b)

所以，总的来说，session的实现实际上会比上述描述的稍微复杂一点，尤其是涉及到安全。所以我们接下来来看一下koa-session是如何实现的。

### 三、koa-session的源码实现？
#### 3.1 中间件主逻辑的源码实现
中间件的主要逻辑实现如下：

	module.exports = function(opts, app) {
	  // ...
	  opts = formatOpts(opts);// 参数格式化
	  extendContext(app.context, opts);// 扩展app.context
	
	  return async function session(ctx, next) {
	    const sess = ctx[CONTEXT_SESSION];
	    if (sess.store) await sess.initFromExternal();
	    try {
	      await next();
	    } catch (err) {
	      throw err;
	    } finally {
	      if (opts.autoCommit) {
	        await sess.commit(); //每次请求结束后commit
	      }
	    }
	  };
	};
	



依赖于[cookie](https://github.com/pillarjs/cookies)

koa/lib/context.js

	  get cookies() {
	    if (!this[COOKIES]) {
	      this[COOKIES] = new Cookies(this.req, this.res, {
	        keys: this.app.keys,
	        secure: this.request.secure
	      });
	    }
	    return this[COOKIES];
	  },
	
	  set cookies(_cookies) {
	    this[COOKIES] = _cookies;
	  }

### cookie和session的区别
https://blog.csdn.net/gwdgwd123/article/details/87432272

https://www.cnblogs.com/l199616j/p/11195667.html
### 为啥koa-session种下的key会同时种下一个带.sig的

因为koa-session在种cookie的时候

### 优化cookie存储，将cookie尽可能存在服务端也能部分提高http速度

参考
https://www.jianshu.com/p/a5ed607cb48b
https://blog.csdn.net/wauit/article/details/47402125
https://www.jianshu.com/p/ac425043e790
https://baijiahao.baidu.com/s?id=1619095369231494766&wfr=spider&for=pc
