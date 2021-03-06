# async vs defer
在前面一篇文章理解关键渲染路径中，作者写过JavaScript文件在关键渲染路径上的影响：
> JavaScript被视为一个“阻塞解析器的资源”。这意味着HTML文档解析被JavaScript阻塞。当解析器遇到`<script>`标签，不论它是内联的还是外联的，它都会停止HTML解析然后请求（如果资源是外联的）它并运行它。

如果我们的页面需要加载很多个JavaScript文件的话，这个情况可能会有些问题，因为这会影响首次渲染时间，不论文档是否依赖于这些资源。

幸运的是，`<script>`元素有2个属性，`async` 和 `defer`，这可以使我们对外联资源如何加载和执行有更多的掌控。

### 常规执行
在我们学习这2个属性会带来哪些影响之前，我们必须首先看一看没有这2个属性的时候`<script>`是如何工作的。

默认情况下，正如上面提到的，JavaScript文件会打断HTML文档的解析，从而进行这些JavaScript文件的请求（如果是外联的）和执行。

例如，下面是某个`<script>`元素在页面中的位置：

	<html>
	<head> ... </head>
	<body>
	    ...
	    <script src="script.js">
	    ....
	</body>
	</html>


在文档解析过程从上往下进行过程中，下图是发生的事情：

![](https://github.com/DuLinRain/pictures/blob/master/async_vs_defer/async_vs_defer_1.png?raw=true)

可以看到，当遇到`<script>`元素时，HTML解析被暂停，用于JavaScript文件的请求（如果是外联的）和执行。

### `async`属性
`async`属性用于告诉浏览器这个脚本可以异步的执行。HTML解析器在遇到带`async`属性的`<script>`元素时不需要暂停，可以并行地进行HTML文档解析和JavaScript文件的请求（如果是外联的）。但是一旦下载完对应的JavaScript文件之后，必须暂停HTML文档解析，执行刚下载的JavaScript文件。

	<script async src="script.js">

![](https://github.com/DuLinRain/pictures/blob/master/async_vs_defer/async_vs_defer_2.png?raw=true)


### `defer`属性
`defer`属性告诉浏览器在整个HTML文档树解析完了之后再执行JavaScript文件：

	<script defer src="script.js">

同`async`属性类似，JavaScript文件可以在HTML解析时并行的请求。但是不同点在于，即使资源已经请求完了，也不需要暂停HTML解析，而是等解析完整个文档树后才执行对应的脚本。

![](https://github.com/DuLinRain/pictures/blob/master/async_vs_defer/async_vs_defer_3.png?raw=true)


### 使用常规还是async还是defer？
所以，我们什么时候用常规的，什么时候用`async`或`defer`呢？这主要取决于你所面对的场景，这里有几个需要考虑的问题。

#### `<script>`元素应该放到哪里？

当`<script>`元素放的不是太靠后的时候，`async`或者`defer`显得更为重要。HTML文档是按顺序解析的，从`<html>`到`</html>`。如果外联脚本本身放的离`</body>`很近，那么继续给它们使用`async`或`defer`属性不是很有必要。因为这个时间HTML解析器已经完成了大部分的解析工作。

#### 对应的资源是自举的吗？
对于那些不被其它文件依赖或者自身不依赖其它文件的资源，`async`属性非常有用。因为我们不关心在哪个时间点这个文件被执行，这种情况异步加载时非常合适的选择。

#### 资源是否依赖于文档解析完整？
在大多数情况下，脚本文件包含和DOM交互的逻辑。或者他可能依赖于页面上其它资源。在这种情况下，在执行对应的脚本之前，DOM必须被解析。通常这种情况下，脚本需要放在页面的最下面。但是，可能因为某些原因，这些资源可能放在任何地方，但是又希望它能在最后执行，则可以使用`defer`属性。

#### 资源是不是一个较小的依赖？
最后，如果这个脚本非常的小，或者它被其它文件依赖，可能更适用于将它以内联形式嵌入。虽然即使是内联的也会阻断HTML解析，考虑到我们假定它非常的小，影响也不会很大。

### 浏览器支持
下面是`async`和`defer`在浏览器中的支持情况：

![](https://github.com/DuLinRain/pictures/blob/master/async_vs_defer/async_vs_defer_4.png?raw=true)

![](https://github.com/DuLinRain/pictures/blob/master/async_vs_defer/async_vs_defer_5.png?raw=true)


值得注意的是，在不同的JS引擎中，这些属性的表现可能会有所不同。在V8中，可能会尝试在一个独立的线程中解析所有的脚本，并忽略相关属性。这种情况下可能就回归到默认情况。

### 参考
- https://bitsofco.de/async-vs-defer/
- https://flaviocopes.com/javascript-async-defer/