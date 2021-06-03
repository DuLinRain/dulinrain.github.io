# net::ERR_INSUFFICIENT_RESOURCES 详解

在浏览器中发起大量请求的时候可能会遇到`net::ERR_INSUFFICIENT_RESOURCES`的报错信息，这是为什么呢？

这其实与Chromium架构的实现有关。Chromium会限制每个渲染进程未完成请求（Outstanding Requset）的数量。一旦达到这个约束，后续的请求都会报net::ERR_INSUFFICIENT_RESOURCES错误。
这个限制是**25MB**，注意，限制的并**不是请求的个数**，而**是请求所占用的资源数**。而这个25MB并不包含请求体（试想，如果包含的话，上传个大文件就跪了），只是包含请求头的大小。在普通长度的请求头下，这个25MB转换成请求个数的话大概是在6000个。如果请求头本身比较大，那这个数量会降低。

这个限制可以在相关的代码中查看：

![图片](https://pic.rmb.bdstatic.com/bjh/news/1c08eca7fabd3c5b57c9261c4c50ffd5.png)


### 参考

- https://codereview.chromium.org/18541
- https://bugs.chromium.org/p/chromium/issues/detail?id=108055
- https://bugs.chromium.org/p/chromium/issues/detail?id=5688
