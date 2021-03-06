# 恶意js脚本代码混淆的原理
本文以https://co.puretou.com/icj.min.js 这个恶意脚本为例来讲述该恶意脚本的代码混淆手段。

### 常规代码混淆方式
一般作为一个正常的开发者，使用webpack等打包js后，js代码都会被压缩、混淆。比如类似这样：


虽然代码经过了压缩、混淆，但是基本的语义还是能看得出大概的。

### 恶意脚本代码混淆
对于恶意脚本而言，通常不希望被人发现恶意代码的逻辑，以防被破解。所以恶意脚本通常会采用比较复杂的混淆方法，效果类似如下：



恶意脚本代码混淆方式比较常见的是16进制混淆以及ASCII码混淆相结合的方式。这两种混淆方式又应用在不同的场景。

####  ASCII码混淆
 ASCII码主要用来混淆实际的恶意逻辑代码，具体而言就是将恶意源代码的每一个字符转成对应的ASCII码值，比如a转成97。ASCII码值本身是不能直接执行的。所以在将恶意源代码转成ASCII码值时需要以一定的规则拼接/加密，以便最终还原成源代码。
 
#### 16进制混淆
 由于ASCII码混淆的结果是一堆ASCII码值拼接/加密组成的内容，不能直接在浏览器宿主执行。所以要想让混淆后的代码执行，必须创建一个壳，壳本身也是一段代码，这个壳需要完成以下几个步骤：
 
 1. 将ASCII码混淆后的恶意源代码还原成初始源代码。
 2. 以某种方式(eval或其它方式)执行源代码。 

这个壳还必须满足：
 
 1. 不容易被别人识别或发现
 2. 能直接在宿主执行。

由于Chrome浏览器可以直接执行16进制的内容，所以恶意代码通常会选择16进制对这个壳进行混淆。

#### 实例分析
下面我们以恶意脚本https://co.puretou.com/icj.min.js 为例来分析它的实现原理。

首先代开代码内容你会发现是类似下面这样的内容：

['ap']["\x66\x69\x6c\x74\x65\x72"]["\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72"](((['ap']+[])["\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72"]['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65']['\x61\x70\x70\x6c\x79'](null,['\x73\x70\x6c\x69\x74'](/[a-zA-Z]{1,}/))))('ap');
