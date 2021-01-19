# 深入理解同源（same-origin）和 同站（same-site）
同站和同源是引用频率很高但是极易理解错误的词语，譬如，它经常在跳转、fetch请求、cookie、新开页面、嵌入资源和iframe这些场景被提及。

###  源（Origin）
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNXI3dxSs3zictcapWF7cZwMe9nVAwvMzgYvicAxNV73n6a84csOdYQF4g/0?wx_fmt=png)

源（Origin）由几个部分组成：

- Schema。通常也被称为协议，比如HTTP和HTTPS。
- 主机名（hostname）。 
- 端口

例如，对于URL `https://www.example.com:443/foo ` 而言，其源（Origin）是`https://www.example.com:443`。

#### 同源和跨源
网站如果拥有相同的协议、域名和端口则被视为同源。否则被视为跨源。比如：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNWAPCoSaVnG7KuJRrnh1sF7nqIlnjhboIvr4OJib6tWrMLNZtc5LhsuQ/0?wx_fmt=png)

### 站（Site）

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNdTBRONeDT2T6SiaHnpJIicJISDDjyHIK42LzVwNyIdOQ8o81XqosZ7jg/0?wx_fmt=png)

站（Site）和源则不一样，站（Site）与协议和端口没有关系，只与域名有关。准确的说，站由**eTLD+1**组成。那么问题来了：

1. 什么是**TLD**?
2. 什么是**eTLD**?
3. 什么是**eTLD+1**？

#### 什么是TLD?
TLD（Top-level domain）表示**顶级域名**。对于像`.com`和`.org`这样的通用顶级域名，其TLD就是`.com`或`.org`，站就是由TLD和它前面第一部分的域名组成。例如，对于URL `https://www.example.com:443/foo`，站（Site）就是**example.com**。

#### 什么是eTLD?
然而，对于.co.jp 或 .github.io这样的域名，只使用TLD和前面的域名（即.co.jp 和 .github.io）是无法标识出一个**站（Site）**的，所以在这种情况下，eTLD（effective TLD，即有效顶级域名）就应运而生了。有效顶级域名的完整定义在这里[Public Suffix List](https://wiki.mozilla.org/Public_Suffix_List)。而所有的有效顶级域名是在[publicsuffix.org/list](https://publicsuffix.org/list/)维护的。

#### 什么是eTLD + 1 ？
鉴于以上复杂情况，完整的**站（Site）**由**eTLD+1**构成，即由有效顶级域名（eTLD）和其前面第一部分的域名组成。例如，对于URL  `https://my-project.github.io`，其**eTLD**是`.github.io`，**eTLD+1**就是`my-project.github.io`，这就是这个URL对应的**站（Site）**。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNgR0M7V1hy66sZ1yZT4VsvOt8TPP2CIa1qLTIRkNt6EYvwvVJUpsZYQ/0?wx_fmt=png)

#### 同站（same-site）和跨站（cross-site）
拥有相同**eTLD+1**的网站被视为同站，否则视为跨站。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmN1dew6vxu1sYUd5HOQD5cKQ7p50B0IRBVOOxkahaaJkQYOjuwV0hbgQ/0?wx_fmt=png)

### 带Schema的同站
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNXbPybIQRDaUfd7UommeRqNG5PWzf4iciaLnK6QX80SsEnLH7iarkH37gw/0?wx_fmt=png)

为了[提高网站的安全性](https://tools.ietf.org/html/draft-west-cookie-incrementalism-01#page-8)，同站的定义也在不断进化，由于浏览器都在朝这个方向跟进，所以你可能会在一些地方看到用`scheme-less same-site`表示旧的同站定义，以及用`schemefull same-site`表示新的定义。比如，按照新的定义，`http://www.example.com` 和 `https://www.example.com` 会被认为跨站，因为他们的协议不一样。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmntWsLWYPcpV8t4JvoKdhmNh1xDbibnSwDeFg3bf4fdTbu9c0xmxiaNAvr9pOSLHWXibDWRxPP1CoAwg/0?wx_fmt=png)

### 如何检测某个请求时同站、同源还是跨站？
Chrome浏览器在发送请求时会带上**`Sec-Fetch-Site`**请求头，在2020年5月的时候，除了Chrome，还没有其它浏览器支持。这个请求头可能会有下面几个值：

- cross-site
- same-site
- same-origin
- none

通过检查**`Sec-Fetch-Site`**头，你可以判断这个请求是`same-site`、`same-origin` 还是`cross-site`，**`Sec-Fetch-Site`**还没有将`schemeful-same-site`包括进去。

### 参考

- https://web.dev/same-site-same-origin/
- https://www.iana.org/domains/root/db
- https://wiki.mozilla.org/Public_Suffix_List
- https://publicsuffix.org/list/
- https://tools.ietf.org/html/draft-west-cookie-incrementalism-01#page-8
