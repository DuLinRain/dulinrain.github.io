# Chrome多进程架构

> 核心思想：Chromium浏览器由浏览器进程(主进程)和渲染进程组成，通常每个tab对应一个渲染进程，每个渲染进程可能包含多个渲染视图，渲染进程和主进程之间通过IPC进行通信。

这篇文档主要讲述Chrome的架构。

### 当时存在的问题

开发一个永远不会Crash的渲染引擎几乎是不可能的，开发一个绝对安全的渲染引擎同样如此。

某种程度上而言，在2006年左右的浏览器和过去那种单用户、协作多任务操作系统类似。这种系统中某个任务的错误行为可能会导致整个系统的崩溃。这个时候的浏览器也类似，某个web页面的异常可能会导致整个浏览器的崩溃。

现在操作系统比之前更加鲁棒，容错率更高。这是因为现代操作系统把应用放在独立的进程中去执行，并且他们之间相互隔离。单个应用的Crash并不会影响其它应用，也不会导致整个系统的崩溃。跨用户间的数据访问也被严格限制。

### 架构概览
Chrome把每个tab放在独立的进程中从而确保单个tab渲染引擎中的bug不会导致整个浏览器的崩溃。同时Chrome还严格限制了某个渲染进程对其它渲染进程以及其它系统的访问。某种意义上来说，这就是把操作系统中**内存保护**和**访问控制**那套理念移植过来了。

一个Chrome浏览器里面会包含多个进程，通常把**渲染UI和管理tabs以及plugins**的进程称作**主进程**（**main proces**s）或者**浏览器进程**（**browser process**）或者**浏览器**（**browser**）。
类似的，每个tab则进程叫做**渲染进程**或者**渲染器**。而渲染器使用的是开源的[Blink](https://www.chromium.org/blink)布局引擎进行HTML的解析和布局。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmn1FQ6ZGu68HY3gqmxcKoRibbe0Y6H8WB0ibdhLUibfCd7hQUzxVkvlLb2S8BTdbrP2cdUCeMO5OecAw/0?wx_fmt=png)
<center>整体架构</center>

### 管理渲染进程
每一个渲染进程都有一个全局 **RenderProcess** 对象，用于管理与父浏览器进程的通信以及全局状态。而浏览器进程则会用一个 **RenderProcessHost** 来维护每个渲染进程，用于管理主进程的状态以及与各渲染进程之间的通信。浏览器进程与渲染进程之间的通信使用的是Chrominum IPC。

### 管理视图
每一个渲染进程都有一个或多个**RenderView**对象，他们都由该渲染进程中的**RenderProcess** 对象管理。每个**RenderView**对象都与tabs中的内容相关联。而针对于渲染器中的每个视图，主进程中的**RenderProcessHost**都会维护一个一一对应的**RenderViewHost**。每个视图都会分配一个ID用于区分同一渲染器内的不同视图。这个ID在同一个渲染器内是唯一的，但是在整个浏览器中并不是唯一的。所以，要想唯一定位到一个视图，需要结合**RenderProcessHost**以及视图ID一起才能做到。而浏览器进程与指定tab内的某个视图之间的通信则是经由**RenderViewHost**对象来完成的，它知道如何通过**RenderViewHost -> RenderProcessHost   -> RenderProcess -> RenderView**  这条链路来传递消息。

### 组成部分和接口

在渲染进程中：

- 渲染进程中的**RenderProcess**负责处理与浏览器进程中的**RenderProcessHost**通信。每个渲染器进程中只会有一个**RenderProcess**。这就是浏览器 <---> 渲染器通信的全部。
- 渲染进程中的**RenderView**通过**RenderProcess**建立与浏览器进程或WebKit嵌入层中的**RenderViewHost**的通信。该对象表示每个tab(或者弹窗)里面每个web页面的内容。

在浏览器进程中：

- **Browser** 代表顶层浏览器窗口。
- **RenderProcessHost**代表浏览器进程与渲染进程之间的单独的IPC链接。对每个渲染进程而言，都会有一个**RenderProcessHost** 与之关联。
- **RenderViewHost** 则封装了与远程 **RenderView** 之间的通信。而**RenderWidgetHost**则处理浏览器中用户的输入以及**RenderWidget**的渲染。

想了解更多细节的话可以参考后面的浏览器是如何显示页面的？

### 共享渲染进程
通常，每个新的窗口或者tab都会在一个新的进程中打开。浏览器进程需要spaw一个新的渲染进程，并且命令该进程创建一个**RenderView**。

某些时候我们希望或者确有必要在不同的窗口或者tab之间共享渲染进程。某个web应用打开（比如JavaScript里使用`window.open`）了一个新的窗口并且希望与它进行同步通信。在这种情况下，当我们打开新的窗口或者tab的时候，我们需要让新的窗口复用打开它的那个窗口/tab的进程。如果总的渲染进程太多或者已经有一个相同域名的tab打开的话，我们也有策略将新tab赋给已有的渲染进程。这些策略会在**进程模型**中详细讲解。

### 检测Crash和异常渲染器
每一个与浏览器主进程中的IPC连接都会监听进程的状态，当收到渲染进程Crash的信号的时候会通知到对应的tab。此时会展示一个crash掉的页面告知用户渲染器crash掉了。用户可以重新加载页面或者导航到新的页面。当这么做的时候，浏览器会创建一个新的渲染器进程。


### 渲染器中的沙盒

考虑到渲染器运行在独立的进程中，我们有机会通过沙盒来限制它访问系统资源。例如，我们可以确保渲染器进程只能通过其父浏览器进程来访问网络。同样，我们可以使用主机操作系统的内置权限来限制其对文件系统的访问。

除了限制渲染进程对网络和文件系统的访问，

In addition to restricting the renderer's access to the filesystem and network, we can also place limitations on its access to the user's display and related objects. We run each render process on a separate Windows "Desktop" which is not visible to the user. This prevents a compromised renderer from opening new windows or capturing keystrokes.

未完待续...

### 参考

- https://www.chromium.org/developers/design-documents/multi-process-architecture
