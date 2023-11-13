# CSS实现背景图悬浮放大

在CSS中如何实现如下效果：
![](https://i0.wp.com/css-tricks.com/wp-content/uploads/2016/08/containers.gif?ssl=1)

实现方式：
div结构做两层，完成是容器，内层是图片，hover图片的时候加scale样式，设置transition。

```css
	<div class="parent">
	  <div class="child"></div>
	</div>
	
	.parent {
	  width: 400px; 
	  height: 300px;
	}
	
	.child {
	  width: 100%;
	  height: 100%;
	  background-color: black; /* fallback color */
	  background-image: url("images/city.jpg");
	  background-position: center;
	  background-size: cover;
	  transition: all .5s;
	}
	
	.parent:hover .child,
	.parent:focus .child {
	  transform: scale(1.2);
	}

```

如过想加个蒙层，可以再用伪元素实现：

```css
	.child::before {
	  content: "";
	  display: none;
	  height: 100%;
	  width: 100%;
	  position: absolute;
	  top: 0;
	  left: 0;
	  background-color: rgba(52, 73, 94, 0.75);
	}
	
	.parent:hover .child:before,
	.parent:focus .child:before {
	  display: block;
	}

```