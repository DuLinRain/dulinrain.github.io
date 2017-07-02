##ElementUI之时间插件Bug
###一、概述
Element UI是饿了么推出的基于VUE的小清新UI开源库，但是也存在许多Bug, 时间插件就存在一个显示的Bug
###二、Element时间插件Bug复现
Element时间插件可以定义快捷时间，如图：
![](http://i.imgur.com/tYNkRyO.png)

但是当快捷时间定义比较多时，底部的“清空”“确定”那个横条会遮住快捷时间的最后一个。如图：

![](http://i.imgur.com/X1maCF4.png)

可以看到，我们明明定义了“最近12周”，但是却没有显示
###三、Element时间插件Bug修复
修复方法就是自己定义CSS覆盖Element的CSS:

![](http://i.imgur.com/wq1Dtno.png)