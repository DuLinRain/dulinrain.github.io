# CSS新属性之aspect-ratio
aspect-ratio是[CSS盒模型](https://www.w3.org/TR/css-sizing-4/#aspect-ratio)中定义的新的属性，用来设置元素的宽高比。目前最新的Chrome、Firefox浏览器都已支持，Safari浏览器也预计会在2021年支持。

### 基本语法
`aspect-ratio`的基本语法如下：

	aspect-ratio: auto || <ratio>;

- 初始值: auto
- 适用于: 适用于除inlinebox和tablebox外的所有元素
- 可继承：否

可选的值如下：

	/* Keyword values */
	aspect-ratio: auto; /* default */
	
	/* Ratio values */
	aspect-ratio: 1 / 1; /* width and height are equal proportion */
	aspect-ratio: 2 / 1; /* width is twice the height*/
	aspect-ratio: 1 / 2; /* width is half the height */
	aspect-ratio: 16 / 9  /* typical video aspect ratio */
	
	/* Global values */
	aspect-ratio: inherit;
	aspect-ratio: initial;
	aspect-ratio: unset;
	
### 适用性
`aspect-ratio`既适用于`replaced元素`（如图片）也适用于`non-replaced元素`（如div）。可能有人会说，对于`replaced元素`（如图片）浏览器不是本身就支持维持它的宽高比吗？比如你给图片设置一个500px的宽度，浏览器会自动的根据图片本身的宽高比来设置它的高度。没错，`aspect-ratio`在`replaced元素`（如图片）上的作用在于可以高效的改变原始的宽高比。

对于`non-replaced元素`（如div）等，本身内部没有宽高比，这种情况下可以用`aspect-ratio`这个特性来实现宽高比的维持。

###  与width和height的相互关系

#### `aspect-ratio`单独使用
`aspect-ratio`可以单独使用，不必显式的设置宽高。其效果如下示例：

	<!doctype html>
	<html>
	  <style>
	    .test {
	      background-color: red;
	      aspect-ratio: 1 / 1;
	    }
	    .test1 {
	      background-color: blue;
	      aspect-ratio: 2 / 1;
	    }
	  </style>
	  <div class="test"></div>
	  <div class="test1"></div>
	</html>
	
#### `aspect-ratio`与`width`或`height`同时使用
`aspect-ratio`也可以与`width`或`height`同时使用，这种情况下，另一边的长度会依据width或者height以及相应的比例算出，如：


	<!doctype html>
	<html>
	  <style>
	    .test {
	      background-color: red;
	      width: 300px;
	      aspect-ratio: 1 / 1;
	    }
	    .test1 {
	      background-color: blue;
	      height: 300px;
	      aspect-ratio: 2 / 1;
	    }
	  </style>
	  <div class="test"></div>
	  <div class="test1"></div>
	</html>

#### `aspect-ratio`与`width`和`height`同时使用
`aspect-ratio`与`width`和`height`同时使用时，`aspect-ratio`会失效，以`width`和`height`为准。

### 其它失效场景
除了上述「`aspect-ratio`与`width`和`height`同时使用」情况下`aspect-ratio`会失效，还有其它情况`aspect-ratio`也会失效。

#### 当容器内容破坏了宽高比的时候
比如一个div元素设置的2:1的宽高比，但是元素里的实际文本很多，导致自动撑开破坏了宽高比：

	<!doctype html>
	<html>
	  <style>
	    body {
	      font-size: 16px;
	    }
	    .test {
	      word-break: break-all;
	      background-color: red;
	      /* min-height: 0; */
	      aspect-ratio: 2 / 1;
	    }
	  </style>
	  <p class="test">哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈
	    </p>
	  <div class="test1"></div>
	</html>


但是如果你同时设置`min-*` 或者 `max-*`，并且`min-*` 或者 `max-*`生效了的话，那么元素还是会保留设置的宽高比，但是内容可能就溢出了。比如：

	<!doctype html>
	<html>
	  <style>
	    body {
	      font-size: 16px;
	    }
	    .test {
	      word-break: break-all;
	      background-color: red;
	      min-height: 0; 
	      aspect-ratio: 2 / 1;
	    }
	  </style>
	  <p class="test">哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈
	    </p>
	  <div class="test1"></div>
	</html>


https://css-tricks.com/almanac/properties/a/aspect-ratio/
