# 小红书uid生成方法探究

首次访问小红书页面（https://www.xiaohongshu.com/discovery/item/5fe071740000000001009d63) 可以发现它种下了5个cookie：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_1.png?raw=true)

下面2个cookie我们可以发现是在访问页面302时，通过服务端种下的：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_2.png?raw=true)


上面2个cookie则是通过接口(https://www.xiaohongshu.com/fe_api/burdock/v2/shield/registerCanvas?p=cc) 种下的：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_3.png?raw=true)

而中间那个`xhsuid`（小红书uid）则不太好找到是在哪里种下的。因为网络请求里都没有set-cookie，所以我们可以认为这个cookie应该是通过JS种下的。
但是具体是哪个JS呢？

我们通过Chrome DevTools把可能不相干的请求一个个block掉，刷新页面发现出现了这个页面

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_4.png?raw=true)

发现是有个重定向(https://www.xiaohongshu.com/web-login/canvas?redirectPath=http%3A%2F%2Fwww.xiaohongshu.com%2Fdiscovery%2Fitem%2F5fe071740000000001009d63) ，这个重定向页面种下了`xhsuid`的cookie。

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_5.png?raw=true)

由于网络响应中并没有`set-cookie`，所以肯定是这个页面的JS。我们来看看这个页面的内容：
预览的话是个转圈圈的图，有点迷惑性：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_6.png?raw=true)

看具体的response的内容是一个HTML，里面包含JS。

我们按关键字`xhsuid`搜索一下，可以在其中搜索到2处信息：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_7.png?raw=true)

由于JS种`cookie`肯定是需要用`document.cookie`，我们也搜索一下，也能搜索到：


![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_8.png?raw=true)

所以基本上是定位到了。

而具体的生成方法，我们可以通过前一张看到设置`cookie`是调用的G函数，而生成`xhsuid`则是调用的H函数，而H函数则如下：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_9.png?raw=true)

整理一下则是：

    H = function(t, e) {
      var n, r, o = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(""), i = [];
      if (e = e || o.length, t)
          for (n = 0; n < t; n++)
              i[n] = o[0 | Math.random() * e];
      else
          for (i[8] = i[13] = i[18] = i[23] = "-", i[14] = "4", n = 0; n < 36; n++)
              i[n] || (r = 0 | 16 * Math.random(), i[n] = o[19 === n ? 3 & r | 8 : r]);
      return i.join("")
    }

测试调用一下：

![](https://github.com/DuLinRain/pictures/blob/master/xhsuid/xhsuid_10.png?raw=true)

可以看到和我们看到的种下的`cookie`格式一致。
