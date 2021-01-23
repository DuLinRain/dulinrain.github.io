# Go调度原理二：Go调度

### 介绍
在该系列的第一篇文章中，我们已经解释了操作系统调度的各个方面，我认为这对理解和欣赏Go调度的语义非常重要。在这一部分，我将从语义层面讲一下Go的调度是如何进行的。Go调度调度本身其实很复杂，很多细节不用过分关注，重要的是通过一个模型来理解Go的调度机制，这有助于在实践中做出更好的决策。

#### 辅助知识——物理核、逻辑核

- **CPU( CentralProcessingUnit)**: 中央处理单元，CPU不等于物理核，更不等于逻辑核。
- **物理核(physical core/processor)**: 可以看的到的，真实的cpu核，有独立的电路元件以及L1,L2缓存，可以独立地执行指令。
- **逻辑核( logical core/processor，LCPU)**: 在同一个物理核内，逻辑层面的核。（比喻，像动画片一样，我们看到的“动画”，其实是一帧一帧静态的画面，24帧/s连起来就骗过了人类的眼睛，看起来像动起来一样。逻辑核也一样，物理核通过高速运算，让应用程序以为有两个cpu在运算）。
- **超线程( Hyper-threading， HT**)：超线程可以在一个逻辑核等待指令执行的间隔(等待从cache或内存中获取下一条指令)，把时间片分配到另一个逻辑核。高速在这两个逻辑核之间切换，让应用程序感知不到这个间隔，误认为自己是独占了一个核。

> 关系: 一个CPU可以有多个物理核。如果开启了超线程，一个物理核可以分成n个逻辑核，n为超线程的数量。

参考：https://cloud.tencent.com/developer/article/1465603

### 程序启动

Go启动后会为其分配一个**逻辑处理器** (**Logical Processor**，**P**)。对于一台机器而言，逻辑处理器的数量是由机器的虚拟核心决定的，有几个虚拟核心就有几个逻辑处理器。而虚拟核心数又和CPU的架构有关的。比如下面这个机器的硬件配置，显示有1个处理器，6个物理核心。理论上一个物理核只会有一个物理线程，但是由于Inter Core i7 的CPU有超线程技术，也就是说一个物理核可以有2个物理线程。所以这个机器实际上有12个物理线程，也可以认为是有12个虚拟核心，也就是说有12个逻辑处理器。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7LSXsV5dWQvT10sib2IJmgfBtSkhKN6DQwoviaQEOdZR2PJgsJHCe4smQ/0?wx_fmt=png)

这个值可以通过Go的`runtime`来验证：

**Listing 1**

	package main
	
	import (
	        "fmt"
	        "runtime"
	)
	
	func main() {
	
	    // NumCPU returns the number of logical
	    // CPUs usable by the current process.
	    fmt.Println(runtime.NumCPU()) // 12
	}

当我在自己的本地机器上运行上面这个程序的时候，`NumCPU()`的输出结果是12，这意味着在我机器上跑的任何Go应用程序都会分配12个**P**。

而每个**P**都会赋予一个**操作系统线程**(**M**)，**M**代表机器的意思。这个线程仍然由操作系统管理，操作系统负责将其放到Core上来执行——正如我们在上一篇文章所讲的那样。这也就意味着，我在我的本机上跑Go应用程序，那将会有12个线程来处理所有的工作，每个线程被赋给了一个P。

而每一个Go应用程序都有一个初始的Go协程，其实就是Go应用程序的执行路径。Go协程本质上就是协程( [Coroutine](https://en.wikipedia.org/wiki/Coroutine) )，但是因为这里是Go所以把协程的第一个字母C换成了G，所以就有了Goroutine这么个词。你可以把Go协程认为是应用程序级别的线程，和操作系统线程不一样但很多方面很类似。区别在于，操作系统线程是在Core上切换上下文，而Go协程是在M上切换上下文。

最后一个难点是运行队列。 Go调度程序中有两个不同的运行队列：**全局运行队列**（**GRQ**，**Global Run Queue**）和 **局部运行队列**（**LRQ**，**Local Run Queue**）。 每个**P**都有一个**LRQ**，该**LRQ**管理分配给在**P**上下文中执行的Goroutine。这些Goroutine轮流在分配给该**P**的**M**中进行上下文切换。**GRQ**用于尚未分配给**P**的Goroutine。有一个将Goroutines从**GRQ**转移到**LRQ**的过程，我们将在后面讨论。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7nTeHQOJ8vfn9O1fjDjzBlmuqPtH9IZYQaUlGhB0ccdsUtBdfibb0pXQ/0?wx_fmt=png)

### 协作调度

在上一篇已经讲过，操作系统的调度是抢占式调度，这意味着，本质上而言，没法预知在某个给定的时间调度程序将会执行啥操作。所有的工作都是内核来完成的，运行在操作系统之上的应用程序无法通过调度来控制内核内部发生的事情，除非它调用类似于 [atomic](https://en.wikipedia.org/wiki/Linearizability) 或者 [mutex](https://en.wikipedia.org/wiki/Lock_(computer_science)) 这样的同步原语。

Go调度则是Go运行时的一部分，并且Go运行时已经内置到应用程序里面。这意味着Go调度运行在用户空间，处在操作系统内核之上。并且，Go调度的实现并不是抢占式的，而是协作式的。协作式调度意味着需要在应用程序中合理的设计调度方案。

但是在实践中你可能感觉到Go调度好像也是抢占式的呀，毕竟我们还是无法预测调度程序将要执行啥操作呀，这是因为该调度程序的决策权并不在开发人员，而是在Go运行时。


### Go协程状态

和操作系统线程一样，Go协程也有三种状态，这决定了Go调度器在任意给定Go协程中的角色。一个Go协程可以处于三种状态：**Waiting**，**Runnable**，**Executing**。

- **Waiting** - 意味着Go协程已暂停，并且在等待一个时机以继续执行。处于这种状态可能是因为在等待操作系统(系统调用)或者同步调用(原子或互斥操作)。这些类型的延迟是导致性能下降的根本原因。
-  **Runnable** - 这意味着Go协程需要M给它分配时间从而执行分配给该协程的指令。如果有很多需要分配时间的Go协程，那意味着Go协程必须等待更长的时间才能执行。而且，随着更多Goroutine争夺时间，分配给单个Goroutine的时间必将缩短。这种类型的调度延迟也可能是性能下降的原因。
- **Executing** - 这意味着Go协程已经被置于M(也就是分配到了时间)并且在执行指令。与应用程序相关的工作正在完成。 这是每个人都想要的状态。

### 上下文切换
Go调度程序需要定义明确的用户空间事件，这些事件发生在代码中的安全点处，以便从上下文进行切换。 这些事件和安全点在函数调用中体现出来。 函数调用对于Go调度程序的运行状况至关重要。 今天（使用Go 1.11或更低版本），如果运行任何未进行函数调用的密集循环，将会导致调度程序和垃圾回收中的延迟。 在合理的时间范围内进行函数调用至关重要。

>注意：有一个建议1.12已被接受，可以在Go调度程序中应用非合作式抢占技术，以允许抢占紧密循环。

在GO程序中，四种类型的事件会让调度器进行调度决策。这并不意味着它将永远在这些事件之一中发生。只是意味着调度程序有机会发生。

- 使用go关键字
- 垃圾收集
- 系统调用
- 同步与编排


#### 使用go关键字
关键字go是用来创建协程的，一旦一个新的协程被创建，会使得调度器有机会做调度决策。
#### 垃圾收集
由于GC使用自己的Goroutine集合运行，因此这些Goroutine需要M上的时间才能运行。 这导致GC造成很多调度混乱。 但是，调度程序非常聪明，它知道Goroutine正在做的事情，它会据此做出明智的决策。 其中一个明智的决定是在GC时对要触及堆的Goroutine与不触及堆的Goroutine进行上下文切换。 当GC运行时，会制定很多决策。
#### 系统调用
如果Go协程发起一个系统调用则会阻塞整个M，调度器有时候有能力将Go协程从**M**上切换出来，并将新的Go协程切换到该**M**上。然而，有时需要一个新的M来继续执行在**P**中排队的Goroutine。但是这些会在下一节中更深入的讲述。
#### 同步与编排
如果原子，互斥或通道操作调用导致Goroutine阻塞，则调度程序可以上下文切换运行新的Goroutine。 一旦被阻塞的Goroutine可以再次运行，就可以对其重新编排，并最终在M上进行上下文切换。

### 异步系统调用
当您正在运行的OS能够异步处理系统调用时，可以使用称为网络轮询器的东西来更有效地处理系统调用。 这是通过在各个操作系统中使用**kqueue**（MacOS），**epoll**（Linux）或**iocp**（Windows）来完成的。

我们今天使用的许多操作系统都可以异步处理基于网络的系统调用。 这也是网络轮询器得名的原因，因为它的主要用途是处理网络操作。 通过使用网络轮询器进行网络系统调用，调度程序可以避免Goroutine在进行这些系统调用时阻塞**M**。 这有助于使**M**保持可用以执行**P**的**LRQ**(**Local Run Queue**)中的其他Goroutine，而无需创建新的**M**。这有助于减少OS上的调度负载。

理解这个过程的最好方式是使用一个例子：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7B1SjU4B3ayYhZz8Z717E3wibEC6rQB7VhhRPiaZl0fXo0lt4TFOw9wZw/0?wx_fmt=png)

上图是一个基本的调度图，Goroutine-1正在**M**上执行，并且有三个Go协程在**LRQ**等待**M**分配时间。网络轮询器处于无事可做的空闲状态。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7ATrJqLaOww5wnACGwB4fuB4MHqAlagiae9zSyrGKsvg1jITMPHBI0ng/0?wx_fmt=png)

在图4中，Goroutine-1想发起一个网络系统调用，所以Goroutine-1被挪到了网络轮询器并且发起异步网络调用。当Goroutine-1被切出**M**并挪到网络轮询器的时候，**M**则可以上下文切换从**LRQ**中取一个新的Goroutine。在这个例子里就是Goroutine-2被上下文切换到**M**执行。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7OjHrwUVB5FIficNAdmsQjqCVfAFugDJz3KHAmKKCgEsLGBopib4Ziat8A/0?wx_fmt=png)

在图5中，网络轮询器完成了异步调用，Goroutine-1被重新放入**LRQ**中等待执行。一旦Goroutine-1可以被上下文切换到**M**的时候，Goroutine-1相关的代码可以再次被执行。这里最大的好处是，执行网络系统调用不需要额外的**M**。 网络轮询器具有操作系统线程，并且高效地处理事件循环。

### 同步系统调用
那如果Go协程发起的系统调用没法被异步执行会怎样呢？

在这种情况下，网络轮询器没法被使用，Go协程发起的这种系统调用会阻塞**M**，这非常不幸但是没有任何办法可以阻止这种状况发生。其中一种没法被异步处理的系统调用就是基于文件的系统调用。如果你在使用**CGO**，那可能会有其他调用C函数的场景也会阻塞**M**。

>注意：windows系统有能力让基于文件的系统调用也是异步完成的。技术上而言，在windows系统上，网络轮询器还是可以使用的。

我们继续看看当同步系统调用(文件IO)阻塞**M**的时候会发生什么。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7zZK0LsM1uwkw9CRicWAnq2ZRxHiaTozVibYNkqndb1eUic6MvyQKzKVbtA/0?wx_fmt=png)

图6显示的仍然是一个基本的调度图，但是这个时候Goroutine-1将要发起的是一个同步系统调用，这将会导致**M1**被阻塞。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7NSlHS7SDfytyAhaLrsbvZHXQ3TWAz7mg8lDuHLHKra0OcDxCqo0IUQ/0?wx_fmt=png)

图7显示，调度器可以识别到Goroutine-1阻塞了**M1**。这个时候，调度器将会将**M1**和**P**进行分离，但是还是会把阻塞**M1**的Goroutine-1带上。同时会用一个新的**M2**赋予**P**。这个时候Goroutine-2可以被从**LRQ**选中，然后上下文切换到**M2**中执行。如果因为之前的交换已经存在一个**M**的话，则会复用这个**M**，而不是创建一个新的**M**，这样的话会更快。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7UXN2bCOvyFAaBMzjIBDYjxCO7EjGJCdUp2icLqQ7FvuehUomCC1UVog/0?wx_fmt=png)

而当Goroutine-1发起的阻塞**M1**中的同步系统调用完成后，Goroutine-1会重新回到**LRQ**中供**P**消费。**M1**则放在旁边供出现类似情况的时候复用。这也就是上面说的，再次出现阻塞系统调用的时候可以复用**M1**而无需创建一个新的M。

### 偷窃工作
另一个关于调度器的点就是：调度器是一个“**偷窃工作**”的调度器。这在某些场景下可以保持调度器的效率。**偷窃工作**有助于在所有**P**上保持Go协程的平衡，从而更好的分配工作和更高效的完成工作。

我们来看个例子：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7L6KOpUQoCptgJ7uVwOOtuPuF0plMnV9VlJSb4P5rG1KrXkng7mrictQ/0?wx_fmt=png)

在图9中，是一个多线程的Go应用程序，其中有2个**P**，每个分别服务4个Go协程，还有一个Go协程在**GRQ**中。那如果其中一个**P**非常迅速的处理完了所有的**G**会导致啥结果呢？

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7ibdJEib2y55f2Qbk0icGCdDrKpxiblqpicxDZFvgibtORNWq06KygxN2kiczw/0?wx_fmt=png)

在图10中，**P1**中已经没有处于**Runnable**状态的Go协程了，但是在**P2**的**LRQ**和**GRQ**中都还存在处于**Runnable**状态的Go协程。这个时候，**P1**就需要偷窃工作了。偷窃的规则如下：


**Listing 2**

	runtime.schedule() {
	    // only 1/61 of the time, check the global runnable queue for a G.
	    // if not found, check the local queue.
	    // if not found,
	    //     try to steal from other Ps. 从其它P中偷
	    //     if not, check the global runnable queue. 从GRQ中偷
	    //     if not found, poll network. 轮询网络
	}

基于`Listing2`中的规则，**P1**会检查**P2** **LRQ**中的Go协程，并从中偷取**一半**。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7cUFces2iaCMTKP9AUfhOMKf7MtVfrqzTcMN41CScFWn3ibhrQVYAe9zw/0?wx_fmt=png)

图11显示，**P1**从**P2**中偷取了一半的Go协程，这个时候**P1**就可以继续执行那些协程了。

那当**P2**执行完它所有的Go协程，而**P1**的**LRQ**中也没有多的Go协程了会发生什么呢？

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7RtcLBtYHDzOtoH2cGyU0WhLn9yTh5AUFnlZUSfUERTLvDMY9Rp9NkQ/0?wx_fmt=png)

在图12中，**P2**完成了他所有的工作，所以需要从别处偷窃工作。起初它在**P1**的**LRQ**中找，发现没有。接着它会在**GRQ**中，这时它发现了Goroutine-9。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7fJX2waT9C8r88wpq5jiayu6Wl4hoCLBOK9ltBD5IFwJQs0K3ibEb7Uxw/0?wx_fmt=png)

在图13中，**P2**从**GRQ**中偷窃了Goroutine-9并执行。所有这些偷窃工作的最大好处是，它可以让**M**保持忙碌而不会闲着。 在内部，这种窃取工作被认为是在旋转**M**。这种旋转还有其他好处，JBD在其[窃取工作](https://rakyll.org/scheduler/)的博客文章中很好地解释了这一点。

### 实践示例
通过上面的讲述，你对调度器的机制和语义有个一定了解。接下来将把这些结合在一起向你讲述Go调度器是如何在一定的时间内处理更多工作的。

想象一个用C语义写的多线程应用，应用程序管理2个操作系统线程，线程之间通过消息通信交互。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG78spGTwcKZpT1e3EDeWGDGH1VRNjAAnVglnmY9POd5A1uuic2PQ0MLXg/0?wx_fmt=png)

在图14中，有2个线程在工作，他们之前通过消息通信交互。**线程1**被上下文切换到Core1上，并且正在被执行，这使得**线程1**可以向**线程2**发送消息。

> 注意：消息是如何传递的并不重要，重要的是在这个编排过程中线程所处的状态。

**Figure15**
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7mctvzcyA01Aw5suEGK5RZtcYBcTh00FMncky6neLGYfl05HQNo5Xxw/0?wx_fmt=png)

在图15中，当线程1发送完消息后，它需要等待回应。这将会导致**线程1**从Core1中切换出去进入**Waiting**状态。当**线程2**接收到消息通知后，它将进入**Runnable**状态。此时，操作系统执行上下文切换，将**线程2**切换到新的Core，比如Core2。然后**线程2**处理收到的消息并且给**线程1**发送响应。

**Figure16**
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7kIlu8rWD2zTNHHicHnCfDFR3lzXtzA6GqiaUuOLtjYwDq7wCb3cQSdrg/0?wx_fmt=png)

当**线程1**收到**线程2**的消息后再次进行上下文切换。**线程2**从Core2上切出进入**Waiting**状态，而**线程1**从**Waiting**状态切入到**Runnable**状态，最终上下文切换到一个新的Core(如Core3)进行执行。然后继续可以发送消息。

所有这些上下文切换和状态更改都需要执行时间，这限制了程序完成工作的速度。每个上下文切换潜在的延迟约为**1000**纳秒，并且通常硬件每纳秒可以执行**12**条指令，因此你可以看到上下文切换期间或多或少大概有**12k**条指令没有执行。由于这些线程也在不同的内核之间跳动，因此由于高速缓存行未命中而导致额外延迟的几率也很大。

让我们看一下同样的例子在使用Go协程和Go调度器下的情景：

**Figure17**
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7aLcqchibCWy50m8IMibFmgVWDsfoQqcnft0Vnib3p0icXdMuQXESeZ0bCQ/0?wx_fmt=png)

在图17中，有2个Go协程在运行，互相之间进行消息通信。G1上下文切换到M1，假设M1恰好运行在Core1上，G1被执行，向G2发送消息。

**Figure18**
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG77K5ZqR9t16Vk66yaA5M0ooDAGWpnNq2hG1dMU6NW5Ls8CadX1QMUnA/0?wx_fmt=png)

在图18中，G1发送完消息，等待G2响应。这会导致G1从**M1**上下文切出，进入**Waiting**状态。当G2收到消息通知后，他将进入**Runnable**状态。这时Go调度器可以执行上下文切换，将G2切大**M1**上执行——**M1**仍然运行在Core1上。接下来，G2处理消息并给G1发送响应。

**Figure19**
![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmlSo5vvqL4CJ1jMtX5nlmG7ytYTFMAzvTZO7kSlqhJruUbcpZeDProqL9JtaUaib770ZiaKdvVVWuNQ/0?wx_fmt=png)

当G1收到G2的消息后再次进行上下文切换。G2从**M1**上切出进入**Waiting**状态，而G1从**Waiting**状态切入到**Runnable**状态，最终上下文切换到**M1**进行执行。然后继续发送消息。

表面上的东西似乎没有什么不同。无论使用线程还是Goroutine，都会发生所有相同的上下文切换和状态更改。使用线程和Goroutines之间的主要区别乍一看可能并不明显，但实际上他们有本质区别。

在使用Goroutines的情况下，所有处理都使用相同的**操作系统线程**(OS Thread)和Core。从操作系统的角度来看，这意味着操作系统线程永远不会进入**Waiting**状态。结果就是，在使用线程时我们在上下文切换期间丢失的所有这些指令在使用Goroutines时不会丢失。

从本质上讲，Go在OS级别将IO/阻塞工作变成了CPU约束工作。由于所有上下文切换都是在应用程序级别进行的，因此，与使用线程相比，我们不会在每个上下文切换期间丢失平均大约12k的指令。在Go中，这些相同的上下文切换使您只花费约200纳秒或约2.4k的指令。调度程序还有助于提高缓存行效率和[NUMA](http://frankdenneman.nl/2016/07/07/numa-deep-dive-part-1-uma-numa)。在Go中，随着时间的推移，有可能完成更多的工作，因为Go调度程序会尝试使用更少的线程，并在每个线程上执行更多操作，这有助于减少操作系统和硬件的负载。

### 总结
Go调度程序在设计时对操作系统和硬件如何工作的复杂性方面的考虑确实非常了不起。将IO/阻塞工作转换成操作系统级别的CPU约束使我们可以利用CPU的更多能力。这也是为啥你不需要比虚拟内核更多的操作系统线程。所有的工作(不论是CPU还是IO/阻塞)都可以通过只有一个操作系统线程的虚拟内核来完成。这既适用于网络应用，也适用于其它无需系统调用的应用。

作为开发人员，你仍然需要了解应用程序的工作方式。你不能创建无限数量的Goroutine，并期望获得惊人的性能。有了这些Go调度器语义的理解，你就可以做出更好的工程决策。在下一篇文章中，我将探讨以保守的方式利用并发性以获得更好的性能，同时仍然平衡可能需要添加到代码中的复杂性的想法。
