# css滚动捕获（scroll snapping）实现翻页效果

滚动捕获（scroll snapping）是css较新的特性，用它可以实现类似PPT翻页，侧滑，轮播图等类似的效果：

![](https://i2.wp.com/css-tricks.com/wp-content/uploads/2020/03/scroll-snap-demo.gif?fit=1024%2C686&ssl=1)

scroll snapping的应用比较简单，基本的DOM结构如下：

```html

<div class="container">
  <section class="child"></section>
  <section class="child"></section>
  <section class="child"></section>
  <p>...</p>
</div>

```

它的结构由外层容器和内容元素组成，外层容器用于指定方向以及停靠模式（近似还是强制），内层则用于指定元素的停靠位置：

```css
.container {
  scroll-snap-type: y mandatory;
}

.child {
  scroll-snap-align: start;
}

```

### scroll-snap-type
scroll-snap-type除了指定方向外，第二个值可以用于指定模式：

- mandatory 表示强制按照scroll-snap-align指定的位置停靠，比如scroll-snap-align设置的是start，则一定会停靠在子元素的开始位置
- proximity 则不强制，仅仅要求近似即可

一般我们用mandatory即可。

![](https://i0.wp.com/css-tricks.com/wp-content/uploads/2018/07/scroll-snap-overflow.jpg?ssl=1)

### scroll-snap-align
scroll-snap-align则用于指定停靠位置，示意如下：

![](https://i0.wp.com/css-tricks.com/wp-content/uploads/2018/07/scroll-snap-align.jpg?ssl=1)

当然还有一些其它的属性，就不细说了。

scroll snapping其实有个问题是，它不能指定停留在哪个元素那，具体停留在哪里取决于滚动的快慢，滚动到哪里就停在哪个元素。所以他不能实现比如一次只翻一页的效果。

W3C也给了一个属性：scroll-snap-stop: normal | always；如果给子元素设置always，则一定要先停在它哪里才能继续向后滚动。但是可惜的是，到目前为止没有一个浏览器实现它。

### 参考
- https://css-tricks.com/practical-css-scroll-snapping/



