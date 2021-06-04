# Sparkplug —— 一个新的非优化JavaScript编译器

2021.05.27日V8发布了新的「**非优化JavaScript编译器**」—— **Sparkplug**。

### 为什么会有Sparkplug？

V8的编译器的由**Full-Codegen**发展到**TurboFan**有了很大的改进。但是一个高性能的引擎应当不止包含优化编译器，因为在进入优化编译器之前还有很多事情要做。

所以从2016年开始，V8开始在编译器之外进行提升JavaScript 的性能的研究。在2016年后，V8陆陆续续在解析器（[Ignition](https://mp.weixin.qq.com/s/ad24Idio_89WIi-rspXEEA)）、流、对象模型、[并发垃圾收集](https://mp.weixin.qq.com/s/RvH_gmDId37QT8eEaZVzEg)、[缓存已编译的代码](https://mp.weixin.qq.com/s/YNSVdrqfLvdoOKdwdd3vCw)方面做了很多的工作。

![](https://pic.rmb.bdstatic.com/bjh/down/3e7caf284b3c61999ef5e3c28746a4f8.png)

然而，当V8团队在尝试改进实际初始 JavaScript 执行的性能时，他们在优化解释器（Ignition）时开始遇到限制。 主要表现在下面几个方面：

- **Ignition解释器有其固有的开销**。V8 的解释器是高度优化的并且非常快，但是解释器有它无法摆脱的固有开销；诸如字节码解码开销或调度开销之类的东西是解释器功能的固有部分。
- **在现有编译器模型（Ignition -> TurboFan）下，代码不好分层优化**。使用V8当前的两个编译器模型（Ignition -> TurboFan），V8团队无法更快地分层优化代码；他们可以努力使它优化更快，但在某些时候，只能通过删除优化通道来提高速度，这会降低峰值性能。更糟糕的是，他们不能真正更早地开始优化，因为那个节点还没有稳定的对象形状反馈。

所以，在2021年，V8引入了一个新的「非优化JavaScript编译器」——**Sparkplug**。

![](https://pic.rmb.bdstatic.com/bjh/news/2e9223d18356e433086a2268f9c07322.png)

### Sparkplug的特点
Sparkplug 的编译速度非常的快，所以导致几乎可以随时进行编译。


### Sparkplug为什么快？
- **输入即是字节码，而非源代码**。Sparkplug的前置过程是Ignition，Sparkplug编译的函数已经被Ignition编译成字节码，字节码编译器（Ignition）已经完成了大部分艰苦的工作，比如变量解析、确定括号是否实际上是箭头函数、解构语句的脱糖（从语法糖还原成原始的）等等。 Sparkplug 从字节码而不是从 JavaScript 源代码编译，因此不必考虑这些问题。
- **没有中间表示 (IR，intermediate representation)**。Sparkplug 在字节码的单个线性传递中直接编译为机器代码，发出与该字节码的执行匹配的代码。事实上，整个编译器是一个 for 循环内的 switch 语句，分派到固定的每字节码机器代码生成函数。

		// The Sparkplug compiler (abridged).
		for (; !iterator.done(); iterator.Advance()) {
		  VisitSingleBytecode();
		}

> 缺少 IR 意味着编译器的优化能力有限，但Sparkplug本身不是做这个的，因为后面都会交给TurboFan进行优化。



### 具体实现原理
参考: [Sparkplug — a non-optimizing JavaScript compiler](https://v8.dev/blog/sparkplug)


###  参考

- [Sparkplug — a non-optimizing JavaScript compiler](https://v8.dev/blog/sparkplug)
- [V8编译器的历史、挑战与发展](https://mp.weixin.qq.com/s/ad24Idio_89WIi-rspXEEA)
