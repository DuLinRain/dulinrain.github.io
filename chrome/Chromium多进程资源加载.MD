# Chromium多进程资源加载

> 核心思想：主进程(浏览器进程)控制所有的网络请求以及管理Coockies

### 背景
在Chromium中，所有的网络通信都是由主进程控制的。这么做的好处不仅可以使得浏览器进程控制所有渲染进程对网络的访问，也可以维护类跨渲染进程的持久性会话状态（如cookie和cache）。另一个比较重要的点是，作为一个HTTP/1.1协议的客户端，浏览器中每个域名下不可以建立太多的网络连接。

### 概览
整个Chromium应用可以划分为三层，最低层的是渲染页面的Blink引擎，在它之上的是渲染进程（最简单情况下，每个tab都有一个独立的），每个渲染进程都包含一个Blink实例，而管理所有渲染进程的则是浏览器进程，它负责所有的网络访问。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk1m6J19AbtvbWfjuS0cH6bLDd3c88sG5SwMhJgwXs23J436PVgH2gqQEh7gQCpVwSk9C3v8DygwQ/0?wx_fmt=png)


### Blink
Blink里面有一个**ResourceLoader**对象负责获得数据，每个loader都有一个**WebURLLoader**用于完成实际的请求，这个接口的头文件在Blink的仓库里。

**ResourceLoader**实现了**WebURLLoaderClient**接口，这是渲染进程使用到的回调接口，用于向Blink发送数据和事件。
### 渲染进程
渲染器进程实现的**WebURLLoader**则被称为**WebURLLoaderImpl**，位于**content/child/**这个地方。它使用全局的**ResourceDispatcher**单体对象（每个渲染器进程只有一个）来创建一个唯一的请求ID，并且把该请求通过IPC转发到浏览器进程。而浏览器中返回的响应则会引用这个请求ID。

### 浏览器进程
浏览器进程中的**RenderProcessHost**接收各个渲染进程通过IPC转发过来的请求，它会把这些请求转发到**ResourceDispatcherHost**，使用一个指向渲染进程的指针以及渲染进程生成的ID来唯一标识这个请求。

然后每个请求被转换成了一个**URLRequest**对象，然后转换成内部的**URLRequestJob**对象，这个对象实现了对应的协议。当**URLRequest**生成了响应通知时，会使用**ResourceDispatcherHost::Receiver**和请求ID将通知发送到**RenderProcessHost**，进而可以进一步发送到对应的渲染进程，由于每个请求ID都有做保存，因此可以将每个请求和最初发起的Blink关联上。
### Cookies
所有的Cookies都由位于**/net/base**的**CookieMonster**对象管理。Chromium不会与其它的网络栈（如WinINET 和 Necko)）共享cookie。因为cookie需要在所有tabs中保持一致，所以**CookieMonster**存在于浏览器进程中(管理所有网络访问)。

页面可以使用`document.cookie`来获取cookie，当使用它时，实际上会从渲染进程发送一个同步请求到浏览器进程来请求cookie。当浏览器进程处理cookie的时候，Blink工作的线程会被阻塞。当渲染进程的I/O线程收到来自浏览器进程的响应的时候，他会把Blink被阻塞的线程唤醒并且把结果返回给JavaScript 引擎

### 参考
- http://dev.chromium.org/developers/design-documents/multi-process-resource-loading
