# Chrome站点隔离
### 概述
站点隔离（Site Isolation）是Chrome中的一个安全feature，提供了对一些安全问题的额外防护。它使得不可信的站点更难从别的站点访问或者窃取你的账户信息。

浏览器中不同的web站点通常是没法互相获取用户数据的，这得归功于实现强制同源策略（Same Origin Policy）的代码。但是偶尔这些代码会有些bug然后恶意网站可能利用它绕过同源策略规则对其它站点进行攻击。Chrome团队致力于尽可能快地修复此类bug。

而站点隔离则是提供了第二道防线让这类攻击更不易成功。它能够确保不同站点的页面总是被放进不同的进程中，每一个都在沙盒中运行，而沙盒是可以对进程的能力进行限制的。它也可以进程从其它站点获取敏感数据。结果就是，恶意站点会发现更难从其它站点窃取数据，即使它能够突破自己进程中的一些约束。
想了解站点隔离提供的更多技术信息以及它是如何实现的，可以参考项目的[设计文档](https://bytedance.feishu.cn/docs/doccnwOvfSJZDg5rxG3mMkJfWae#YZVJcz)。

### 动机
Web浏览器的安全非常重要：浏览器必须抵御不信任的站点对其它站点进行攻击以及对用户机器进行控制。考虑到浏览器的复杂性，必须使用一种“深度防御”方法来限制攻击者万一通过某种手段绕过了同源策略或者浏览器内部的安全逻辑造成的攻击。因此，Chrome使用了沙盒（sandbox）以及站点隔离（Site Isolation）技术来尝试防御更强的攻击（如：攻击者可能知道浏览器的bug）。这是由多种不同类型的攻击激发Chrome这么做的。

首先，被污染的渲染器进程（也被称为发生在渲染进程中的“任意代码执行”攻击）需要被明确地纳入到浏览器安全威胁模型中。我们认为，出于以下几个原因，有耐心的攻击者将能够找到一种方法来危害渲染器进程：

- 过去的经验表明，未来的Chrome发布版本中可能会存在潜在的可利用bug。在[M69版本中有10个潜在可利用的bug](https://bugs.chromium.org/p/chromium/issues/list?can=1&q=Release=0-M69,1-M69,2-M69,3-M69+Type=Bug-Security+Security_Severity=High,Critical+-status:Duplicate+label:allpublic+component:Blink,Internals%3ECompositing,Internals%3EImages%3ECodecs,Internals%3EMedia,Internals%3ESkia,Internals%3EWebRTC,+-component:Blink%3EMedia%3EPictureInPicture,Blink%3EPayments,Blink%3EStorage,Internals%3ECore,Internals%3EPrinting,Internals%3EStorage,Mojo,Services%3ESync,UI%3EBrowser&sort=m&groupby=&colspec=ID+Status+CVE+Security_Severity+Security_Impact+Component+Summary)，[M70中有5个](https://bugs.chromium.org/p/chromium/issues/list?sort=m&groupby=&colspec=ID%20Status%20CVE%20Security_Severity%20Security_Impact%20Component%20Summary&q=Release=0-M70,1-M70,2-M70,3-M70%20Type=Bug-Security%20Security_Severity=High,Critical%20-status:Duplicate%20label:allpublic%20component:Blink,Internals%3ECompositing,Internals%3EImages%3ECodecs,Internals%3EMedia,Internals%3ESkia,Internals%3EWebRTC,%20-component:Blink%3EMedia%3EPictureInPicture,Blink%3EPayments,Blink%3EStorage,Internals%3ECore,Internals%3EPrinting,Internals%3EStorage,Mojo,Services%3ESync,UI%3EBrowser&can=1)，[M71中有13个](https://bugs.chromium.org/p/chromium/issues/list?sort=m&groupby=&colspec=ID%20Status%20CVE%20Security_Severity%20Security_Impact%20Component%20Summary&q=Release=0-M71,1-M71,2-M71,3-M71%20Type=Bug-Security%20Security_Severity=High,Critical%20-status:Duplicate%20label:allpublic%20component:Blink,Internals%3ECompositing,Internals%3EImages%3ECodecs,Internals%3EMedia,Internals%3ESkia,Internals%3EWebRTC,%20-component:Blink%3EMedia%3EPictureInPicture,Blink%3EPayments,Blink%3EStorage,Internals%3ECore,Internals%3EPrinting,Internals%3EStorage,Mojo,Services%3ESync,UI%3EBrowser&can=1)，[M72中有13个](https://bugs.chromium.org/p/chromium/issues/list?sort=m&groupby=&colspec=ID%20Status%20CVE%20Security_Severity%20Security_Impact%20Component%20Summary&q=Release=0-M72,1-M72,2-M72,3-M72%20Type=Bug-Security%20Security_Severity=High,Critical%20-status:Duplicate%20label:allpublic%20component:Blink,Internals%3ECompositing,Internals%3EImages%3ECodecs,Internals%3EMedia,Internals%3ESkia,Internals%3EWebRTC,%20-component:Blink%3EMedia%3EPictureInPicture,Blink%3EPayments,Blink%3EStorage,Internals%3ECore,Internals%3EPrinting,Internals%3EStorage,Mojo,Services%3ESync,UI%3EBrowser&can=1)，[M73中有15个](https://bugs.chromium.org/p/chromium/issues/list?sort=m&groupby=&colspec=ID%20Status%20CVE%20Security_Severity%20Security_Impact%20Component%20Summary&q=Release=0-M73,1-M73,2-M73,3-M73%20Type=Bug-Security%20Security_Severity=High,Critical%20-status:Duplicate%20label:allpublic%20component:Blink,Internals%3ECompositing,Internals%3EImages%3ECodecs,Internals%3EMedia,Internals%3ESkia,Internals%3EWebRTC,%20-component:Blink%3EMedia%3EPictureInPicture,Blink%3EPayments,Blink%3EStorage,Internals%3ECore,Internals%3EPrinting,Internals%3EStorage,Mojo,Services%3ESync,UI%3EBrowser&can=1)。尽管对开发人员的培训，模糊测试，漏洞奖励计划等进行了多年的投入，但这些bug数量仍保持稳定。并且值得注意的是，这仅仅包括已报告给Chrome或由Chrome团队发现的错误，还可能存在未被报告或未被发现的bug。
- 安全bug常常会被利用：即使是[1个字节缓冲区溢出也可能导致bug被利用](https://googleprojectzero.blogspot.com/2014/08/the-poisoned-nul-byte-2014-edition.html)。
- 部署的一些缓解措施（例如[ASLR](http://en.wikipedia.org/wiki/Address_space_layout_randomization)（随机地址空间分配）或 [DEP](https://en.wikipedia.org/wiki/Executable_space_protection#Windows)（数据执行保护技术））[并不总是有效](https://googleprojectzero.blogspot.com/2019/04/virtually-unlimited-memory-escaping.html)的。

其次，通用的跨站脚本攻击（UXSS， universal cross-site scripting）也有类似的威胁。这类安全bug通常会使得攻击者绕过渲染器进程中的同源策略，尽管这不会使攻击者完全控制渲染进程。这种漏洞还很[普遍](https://ai.google/research/pubs/pub48028)。

第三，即使没有Chrome中的bug，诸如[Spectre](https://spectreattack.com/)之类的旁路攻击也可以读取任意渲染器进程内存。 这给渲染器过程中的敏感数据带来了额外的风险，并且可以使利用更加容易。

Chrome的架构提供了对这类攻击额外的防御。Chrome的[沙盒](https://chromium.googlesource.com/chromium/src/+/master/docs/design/sandbox.md)可以阻止一个被污染的渲染进程获取任意本地资源（如文件、设备）。而站点隔离可以保护其它站点免受被污染进程的攻击、通用XSS以及类似Spectre这样的旁路攻击。

> 也就是说，通过**沙盒**限制渲染进程对计算机资源的访问能力，通过**站点隔离**限制不同进程之间的感染。

想了解更多背景和动机，可以在[Usenix 2019安全会议文章](https://www.usenix.org/conference/usenixsecurity19/presentation/reis)中查看。


### 当前状态
默认情况下，Windows，Mac，Linux和Chrome操作系统上的Chrome >=67中的所有站点都启用了站点隔离，以帮助防御能够读取进程中原本无法访问的数据的攻击，例如Spectre/Meltdown等[推测性的旁路攻击技术](https://security.googleblog.com/2018/01/todays-cpu-vulnerability-what-you-need.html)。

从Chrome 77开始，其他保护措施已经到位：在RAM>=2 GB 的Android设备上已为用户登录的站点启用了站点隔离。 在桌面平台上，站点隔离现在还可以防御完全受到危害的渲染器进程和UXSS攻击。

这些保护是通过改变浏览器的如下行为做到的：

- 跨站文档总是会放入不同的渲染进程，不管这个导航是在当前tab还是一个新tab还是iframe。注意：在Android设备上，为了降低性能，只有一部分站点会隔离。
- 跨站数据（尤其是HTML、XML、JSON和PDF文件）在服务器同意（使用[CORS](https://www.w3.org/TR/cors/)）之前是不会返回给用户页面的。
- 浏览器进程中的安全检查可以检测和终止行为不端的渲染进程（目前只在桌面平台启用）


### 已知问题
站点隔离代表着Chrome的一次大的架构改变，所以开启它肯定会有一些缺点，比如增加内存消耗。Chrome团队正在尽可能的减少消耗和修复功能问题。一些已知的问题如下：

#### 对用户：
- Chrome较高的内存占用。在桌面版Chrome 67中，当打开许多个tab都被站点隔离时内存占用率是10-13%。在Android Chrome 77中大概是3-5%。

#### 对web开发者:
- 全页面布局不再同步，因为页面的frame可能会分散在多个进程中。 这可能会影响更改frame大小然后向其发送postMessage的页面，因为接收frame在接收消息时可能尚不知道其新大小。 一种解决方法是，如果接收frame需要，则在postMessage本身中发送新的大小。 从Chrome 68开始，页面也可以通过在发送postMessage之前在发送frame中强制布局来解决此问题。 有关更多详细信息，请[参见网站开发人员需要了解的网站隔离](https://bytedance.feishu.cn/docs/doccnwOvfSJZDg5rxG3mMkJfWae#4bzLCH)。
- 关闭选项卡时，卸载的handlers可能并不总是会运行。 这种情形下postMessage可能不能工作（[964950](https://crbug.com/964950)）。
- 使用`--disable-web-security`进行调试时，可能还需要禁用站点隔离（使用`--disable-features = IsolateOrigins,site-per-process`）以访问跨域框架。

### 如何配置
对大多数用户而言，不用做任何事情。对于一些更高级的场景，有2种方式可以开启站点隔离：**隔离所有站点**和**隔离特定站点**。


#### 隔离所有站点
这种模式在Windows, Mac, Linux 和 Chrome OS平台上的Chrome是对所有用户100%开启的。对于有充足内存并且想要最高安全性能的Android用户而言，下面的指令也有效。
这种模式可以确保所有的站点都放在各自的进程中运行，不会与其它站点进行共享进程。可以使用下面2种方式开启：

- 在Chrome中输入`chrome://flags#enable-site-per-process`，点击启用，重启。(注意在写本文的时候，这个选项只在Android上有效，在别的平台都是默认开启的，只会有个选项供关闭)

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmN8dRb2vvbjsx2p2s8RjMUYFMuX7QHzKYE1cFuIViaF0pAQQ1yGhfEib3A/0?wx_fmt=png)

- 或者使用[企业政策](https://support.google.com/chrome/a/answer/7581529)为企业开启 [SitePerProcess](https://www.chromium.org/administrators/policy-list-3#SitePerProcess) 或 [SitePerProcessAndroid](https://www.chromium.org/administrators/policy-list-3#SitePerProcessAndroid)。


#### 隔离特定站点
这种模式允许你提供一个包含特定源的列表，这些会被用单独的进程处理而不是对所有站点都进行隔离。这种模式的主要优点是，尽管需要知道哪些站点最需要隔离，但它通常比隔离所有站点使用更少的内存。如果使用这种模式的话，推进将需要额外保护的站点放进这个列表，比如你登录的任何网站。（注意子域名会自动的包含进去，所以如果列表里是 https://google.com 那么也会对https://mail.google.com进行保护）。这种模式在Android上Chrome 77版本是默认开启的，即对所有用户登录的站点开启站点隔离。


这种模式可以以如下任意一种方式开启：

- Chrome 77或后续版本，开启`chrome://flags/#isolate-origins`，并输入需要隔离的域名（如https://example.com,https://youtube.com）并重启浏览器。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNyfP8VTL3CvtXPtFCHribl1gb4qhOcQKWiciawL9oXVWIj8wjHv7JZ93Iw/0?wx_fmt=png)

- 使用命令行标识`--isolate-origins`启动浏览器，后面跟一串逗号分隔的域名，如：
`--isolate-origins=https://google.com,https://youtube.com`。需要注意的是不要将有效的顶级域名包含进去（如https://co.uk/ 或 https://appspot.com/， 可以在https://publicsuffix.org/这里查看所有列表），因为这些会被忽略掉。
- 或者使用[企业政策](https://support.google.com/chrome/a/answer/7581529)为企业开启 [SitePerProcess](https://www.chromium.org/administrators/policy-list-3#SitePerProcess) 或 [SitePerProcessAndroid](https://www.chromium.org/administrators/policy-list-3#SitePerProcessAndroid)。

> 注意：对chrome://flags或者命令行的改动只会影响到当前设备，不会同步给其它的Chrome。


#### 问题诊断
如果你在站点隔离开启的状态下遇到了问题，你可以通过取消上面的操作来关掉它，来看看问题是否解决。
你也可以通过访问`chrome://flags＃site-isolation-trial-opt-out`，选择“Disabled (not recommended)”并重新启动，来尝试诊断错误。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNDt4lcKBu2uvFGKv55Tpicicqh7K9UDJibpy4Q386OqXBNia0F0qSr8oAiaQ/0?wx_fmt=png)

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNFZFk7cS9Jd4C1HHfMOibVRKdvYjuUBVDZYibuFgWY5CYAp4zOfObKYcA/0?wx_fmt=png)

使用`--disable-site-isolation-trials`启动Chrome浏览器和上面是同样的效果。

> 注意：如果站点隔离是用企业政策开启的，那么上述的几种方式都不能将其关掉。


#### 验证
你可以输入`chrome://process-internals`来看站点隔离是否开启。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmN3mf3jg9ibd7ZY36hcn4wOjEFbqY6rhyVK4wY3U5h1L0ZUTXTxR8FveA/0?wx_fmt=png)

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNLeldG3I9xfVQbUMbx9g9vS2waYQZWvOCNBCsrmw0riaAmd9icyLXnrMw/0?wx_fmt=png)

如果您想测试实践中是否成功打开了站点隔离，可以按照以下步骤操作：

##### 1. 导航到某个拥有跨站子frame的站点，例如
###### a. 导航到http://csreis.github.io/tests/cross-site-iframe.html

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmN69WEVgV6seIjcS6Ih28Dia3ELgHZmsMX4LZj2gECUTgvzztzqHaxr6w/0?wx_fmt=png)

###### b. 点击**Go cross-site** (complex page)按钮
###### c.  主页面会在http://csreis.github.io/站点下，而子页面会在https://chromium.org/站点下。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNI9USHrzchnv1aRktdtUn8ibpzO64DYPkic3icyKzwyyVkIqgUnJgQHT5g/0?wx_fmt=png)

##### 2. 打开Chrome任务管理器：**Chrome Menu** -> **More tools** -> **Task manager** (Shift+Esc)
##### 3. 验证主页面和子页面是分别列在独立的一行有着独立的进程，比如：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNgEKSv3g09ULSB2IxjmzibpBYBkYdqR0rkXC9JWWjfzoxBWZBicQl3Jfw/0?wx_fmt=png)

进程ID分别为`23157`，`23174`。

如果你在Chrome任务管理器中看到了子frame，证明站点隔离被正确的开启了。当使用**隔离所有站点**（即`--site-per-process`）方式时上面的步骤会奏效。在**隔离特定站点**（`--isolate-origins`）模式下，如果对应列表中包含 http://csreis.github.io 和 https://chromium.org 这2个域名的话，上述步骤也会生效。


### 给WEB开发者的建议
网站隔离可以帮助保护您网站上的敏感数据，但前提是Chrome可以将其与允许任何网站请求的其他资源（例如图像，脚本等）区分开来。 Chrome当前会根据MIME类型和其他HTTP标头来尝试识别包含HTML，XML，JSON和PDF文件的URL。有关如何确保网站隔离中的敏感信息，请参阅 [Cross-Origin Read Blocking for Web Developers](https://www.chromium.org/Home/chromium-security/corb-for-developers)。
考虑从HTTP服务器发送“[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cross-Origin_Resource_Policy_(CORP)) ”响应标头，以将敏感内容加入其额外的保护措施。考虑在开始处理请求之前检查HTTP服务器中的[Sec-Fetch-Site](https://w3c.github.io/webappsec-fetch-metadata/)请求标头，以识别请求的源。

可以查看[网站开发者需要了解的站点隔离](https://developers.google.com/web/updates/2018/07/site-isolation)了解更多关于站点隔离是如何保护web页面以及那些case会影响页面行为的讨论。

### 参考
- https://www.chromium.org/Home/chromium-security/site-isolation
- https://www.usenix.org/conference/usenixsecurity19/presentation/reis
- https://developers.google.com/web/updates/2018/07/site-isolation