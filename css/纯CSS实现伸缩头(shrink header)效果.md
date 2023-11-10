# 纯CSS实现伸缩头(shrink header)效果

![](https://i0.wp.com/css-tricks.com/wp-content/uploads/2021/02/1s0Ea8DEbYPwwbzrt3C1g4g.gif?resize=1000%2C646&ssl=1)
上面是一种经常会见到的网页头部伸缩效果，看起来需要JS来实现，实际上可以仅通过简单的CSS就能实现。

### 核心实现

```js
<header class="header-outer">
  <div class="header-inner">
    <div class="header-logo">log</div>
    <nav class="header-navigation">导航</nav>
  </div>
</header> 
```

核心是设计两层header结构，内外两层高度不一样，假设外层120px，内层70px；内外两层都设置position: sticky；内层的top值设置0，外层的top值设置成：内层高度 - 外层高度；

### 完整示例
完整的示例代码如下：

```html
<!DOCTYPE html>
<html>
  <style>
    body {
      height: 100%;
      overflow: scroll;
      margin: 0;
      padding: 0;
      background-color: #F0F4F8;
    }
    .header-outer {
      position: sticky;
      height: 120px;
      top: -50px;
      display: flex;
      align-items: center;
      background-color: white;
    }
    .header-inner {
      position: sticky;
      height: 70px;
      top: 0;
      display: flex;
      align-items: center;
      background-color: white;
      width: 100%;

    }
    .content {
      height: 1000px;
      height: 1000px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
  <body>
    <header class="header-outer">
      <div class="header-inner">
        <div class="header-logo">log</div>
        <nav class="header-navigation">导航</nav>
      </div>
    </header> 
    <div class="content">hehe</div>  
  </body>
</html>
```

