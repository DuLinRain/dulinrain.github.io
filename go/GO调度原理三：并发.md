# GO调度原理三：并发


### 什么是并发
**并发**的意思就是“**乱序执行**”，对一组本来应该顺序执行的指令，以某种方式乱序地执行他们并得到同样的输出结果。对于摆在你面前的问题而言，乱序执行显然会增加价值。这里所说的价值是指，以增加复杂性为代价来换取更好的性能。当然主要还是取决于你所面对的问题，可能有时候乱序执行并不可行或者不会带来任何收益。

同样需要理解的是**并发并不是并行**。并行意味着同时执行2个或者更多的指令。这与并发的概念是不同的。并行只有在你拥有至少2个操作系统线程(硬件线程)并且有2个Go协程，每个Go协程运行在独立的操作系统线程的情况下才有可能。

![](https://github.com/DuLinRain/pictures/blob/master/go3-1.png?raw=true)

在图1中，你可以看到2个逻辑处理器(P)，每个逻辑处理器都赋有各自独立的OS线程（M），每个M都关联到一个独立的硬件线程（Core）。你可以看到2个Go协程（G1和G2）并行地执行，在各自的OS/硬件线程上同时执行着各自的指令。
而在每一个逻辑处理器中，3个Go协程轮流享用着对应的OS线程，所有这些协程并发的运行，随机地享用对应的OS线程并执行其指令。

有些时候，以非并行的形式并发会降低吞吐量。更有趣的是，有时候，以并行的形式并发也不会给你带来想想中那么大的性能提升。


### 负载
那么我们怎么知道什么时候乱序执行可以给我们带来收益呢？可以从你的应用程序所处理的负载类型来入手。当考虑到并发的时候，理解2种不同类型的负载非常重要。

- **CPU约束型**(**CPU-Bound**，或**CPU密集型**) - 这种类型的负载永远不可能导致Go协程自然的进入/离开Waiting状态。这类工作一般是持续的进行计算工作。计算Pi小数点后N位可以视为一个CPU约束型工作。
- **I/O约束型**(**I/O-Bound**，或**I/O密集型**) - 这种类型的负载会导致Go协程自然的进入到**Waiting**状态。这种工作通常是通过网络请求访问资源或者发起操作系统调用或者等待某个事件发生。一个需要读取文件的Go协程可视为I/O约束型的。这里我会把可以导致Go协程进入等待状态的同步事件(mutexes, atomic)也归为这一类。

如果负载是**CPU约束型**的，那你**需要**并行地调用并发。对于这种类型的负载，由于Go协程不会自然的进入/离开**Waiting**状态。所以在这种情况下用单个OS/硬件线程来跑多个Go协程是低效的，会降低负载的处理速度。因为把Go协程切入和切出OS线程上会造成延迟。这种场景下的上下文切换会产生“**暂停世界**(**Stop The World**)”这种效果，因为在上下文切换这段时间，任何负载工作都不会被执行。


而如果负载是**I/O约束型**的，那你**无需**并行地调用并发。对于 这种类型的负载，由于Go协程会自然的进入/离开**Waiting**状态。所以在这种情况下用单个OS/硬件线程来跑多个Go协程是非常高效的，会加速负载的处理速度。因为把Go协程切入和切出OS线程不会产生“**暂停世界**(**Stop The World**)” 这种效果，因为在上下文切换时，前一个Go协程是自然暂停的，新的Go协程会切入OS/硬件线程执行，不会导致该OS/硬件线程闲置。

> 提示：什么意思呢？
> 
> 也就是说，对于CPU密集型任务而言，本身不希望中途被打断，所以频繁上下文切换会打断执行，降低效率。
>
> 而对于I/O密集型任务而言，本身就会有暂停的时候。在暂停的时候将其移出OS线程同时移入其它Go协程处理并不会带来损失，反而可以提高效率。


那我们怎么知道每个OS/硬件线程跑多少个Go协程可以带来最佳的吞吐量呢？Go协程太少会导致OS线程空闲时间变多，而Go协程太多则会导致上下文切换带来的延迟增加。这是你需要思考的问题，本文不会做过多的讨论。

此刻，有必要用一些例子来巩固一下你对哪种情况适合用并发，哪种情况不适合以及是否需要用并行的判别能力了。
### 求和
我们不需要特别复杂的例子来描述这些场景，使用下面这个简单的求和函数的例子就可以：

**Listing 1**

	func add(numbers []int) int {
	   var v int
	   for _, n := range numbers {
	       v += n
	   }
	   return v
	}

**Listing 1** 中是一个求和函数`add`，接受一个`int`数组返回数组所有元素的和。

**问题**：这个add函数所负责的工作是否适合乱序执行？我认为答案是适合。这个数组可以拆分成小数组然后并发的执行。一旦所有的小数组都求和完成后，将他们的结果加起来就是最终的结果，和直接求和结果一样。

然而，这会儿会有另外一个问题浮现。需要拆成多少数组才能达到最佳的吞吐呢？要回答这个问题，你需要先了解`add`函数属于哪种负载。`add`函数实际上是一种CPU约束型负载。因为它这个算法执行的是纯数学计算，任何时候都不会导致Go协程自然的进入到Waiting状态。这意味着每个OS/硬件线程跑一个Go协程就能达到很好的性能。

**Listing 2** 中是实现的一个并发版求和函数`addConcurrent`

> 注意：有很多种方式实现并发版的add，这里只是做个示例。

**Listing 2** 

	44 func addConcurrent(goroutines int, numbers []int) int {
	45     var v int64
	46     totalNumbers := len(numbers)
	47     lastGoroutine := goroutines - 1
	48     stride := totalNumbers / goroutines
	49
	50     var wg sync.WaitGroup
	51     wg.Add(goroutines)
	52
	53     for g := 0; g < goroutines; g++ {
	54         go func(g int) {
	55             start := g * stride
	56             end := start + stride
	57             if g == lastGoroutine {
	58                 end = totalNumbers
	59             }
	60
	61             var lv int
	62             for _, n := range numbers[start:end] {
	63                 lv += n
	64             }
	65
	66             atomic.AddInt64(&v, int64(lv))
	67             wg.Done()
	68         }(g)
	69     }
	70
	71     wg.Wait()
	72
	73     return int(v)
	74 }


List2中展示的是并发版的add函数，与非并发版的add函数5行代码相比，并发版的addConcurrent使用了26行代码。因为有不少代码，所以接下来只会将一些关键的代码。

**Line 48**: 每个Go协程只会得到它们独占的一小部分数值进行相加。数值的多少是用总数值量除以Go协程数量来确定的。
**Line 53**: 创建了Go协程池用来执行add操作
**Line 57-59**: 最后一个Go协程将会把剩余的数值进行相加，这部分数量可能会比其它协程分配的多点。
**Line 66**: 最终会把所有协程add的结果再加起来

并发版本看起来比非并发版本要复杂不少，那这样做是否有价值呢？回答这个问题的最好方式就是写一些benchmark测试一下。这里选取测试数组的大小是1000万并且把垃圾回收关闭掉。下面就分别是一个串行版add和并行版addConcurrent的benchmark函数。

**List4**

	func BenchmarkSequential(b *testing.B) {
	    for i := 0; i < b.N; i++ {
	        add(numbers)
	    }
	}
	
	func BenchmarkConcurrent(b *testing.B) {
	    for i := 0; i < b.N; i++ {
	        addConcurrent(runtime.NumCPU(), numbers)
	    }
	}

下面是在只有一个OS/硬件线程情况下的运行结果。串行版只使用一个Go协程，并发版使用了**runtime.NumCPU** 个协程(在本文作者机器上这个数字是8)。在这种场景下，并发版本是以非并行的方式进行并发的。

**Listing 4**

	10 Million Numbers using 8 goroutines with 1 core
	2.9 GHz Intel 4 Core i7
	Concurrency WITHOUT Parallelism
	-----------------------------------------------------------------------------
	$ GOGC=off go test -cpu 1 -run none -bench . -benchtime 3s
	goos: darwin
	goarch: amd64
	pkg: github.com/ardanlabs/gotraining/topics/go/testing/benchmarks/cpu-bound
	BenchmarkSequential                  1000           5720764 ns/op : ~10% Faster
	BenchmarkConcurrent                  1000           6387344 ns/op
	BenchmarkSequentialAgain             1000           5614666 ns/op : ~13% Faster
	BenchmarkConcurrentAgain             1000           6482612 ns/op
	
	
> 注意： 在本地运行benchmark是比较复杂的。复杂的不是运行本身，而是执行环境。有太多的因素会导致benchmark不准。请确保你的机器尽可能处于空闲状态并且尽可能少地执行benchmark函数。
> 


**List4** 中的benchmark结果表明，在只有一个OS/硬件线程的情况下，串行版本比并发版本块约10% ~ 13%。可能你会有点惊讶，但这确是符合预期的。因为在只有一个OS/硬件线程的情况下，并发版本会运行多个Go协程，这会导致频繁的进行上下文切换，进行导致性能反而下降。

下面是在每个Go协程都可以独占一个OS/硬件线程情况下的运行结果。同样，串行版只使用一个Go协程，并发版使用了`runtime.NumCPU` 个协程(在本文作者机器上这个数字是8)。在这种情况下，并发版本是以并行的方式进行并发的，因为OS/硬件线程足够多。


**Listing 5**

	10 Million Numbers using 8 goroutines with 8 cores
	2.9 GHz Intel 4 Core i7
	Concurrency WITH Parallelism
	-----------------------------------------------------------------------------
	$ GOGC=off go test -cpu 8 -run none -bench . -benchtime 3s
	goos: darwin
	goarch: amd64
	pkg: github.com/ardanlabs/gotraining/topics/go/testing/benchmarks/cpu-bound
	BenchmarkSequential-8                    1000           5910799 ns/op
	BenchmarkConcurrent-8                    2000           3362643 ns/op : ~43% Faster
	BenchmarkSequentialAgain-8               1000           5933444 ns/op
	BenchmarkConcurrentAgain-8               2000           3477253 ns/op : ~41% Faster
	
	
List5 中的benchmark表明，在每个Go协程都可以使用一个OS/硬件线程的情况下，并发版本比串行版本快约41% ~ 43%。这也是符合预期的，因为这种情况下每个Go协程都是以并行的方式工作，不会有频繁的上下文切换。
### 排序
需要注意的是，并不是所有的CPU约束型工作都适合用并发。在很难将任务拆解成子任务或者将子任务结果合并的场景下是非常明显的。冒泡排序就是这种场景下的一个极好的例子。看一下下面这个使用Go实现的冒泡排序。

需要注意的是，并不是所有的CPU约束型工作都适合用并发。在很难将任务拆解成子任务或者将子任务结果合并的场景下是非常明显的。冒泡排序就是这种场景下的一个极好的例子。看一下下面这个使用Go实现的冒泡排序。

**Listing 6**
Playgroud https://play.golang.org/p/S0Us1wYBqG6

	01 package main
	02
	03 import "fmt"
	04
	05 func bubbleSort(numbers []int) {
	06     n := len(numbers)
	07     for i := 0; i < n; i++ {
	08         if !sweep(numbers, i) {
	09             return
	10         }
	11     }
	12 }
	13
	14 func sweep(numbers []int, currentPass int) bool {
	15     var idx int
	16     idxNext := idx + 1
	17     n := len(numbers)
	18     var swap bool
	19
	20     for idxNext < (n - currentPass) {
	21         a := numbers[idx]
	22         b := numbers[idxNext]
	23         if a > b {
	24             numbers[idx] = b
	25             numbers[idxNext] = a
	26             swap = true
	27         }
	28         idx++
	29         idxNext = idx + 1
	30     }
	31     return swap
	32 }
	33
	34 func main() {
	35     org := []int{1, 3, 2, 4, 8, 6, 7, 2, 3, 0}
	36     fmt.Println(org)
	37
	38     bubbleSort(org)
	39     fmt.Println(org)
	40 }
	
	
List6中是Go语言实现的冒泡排序。通过不断的扫描数组元素并进行交换实现排序。取决于数组的顺序，在最终排序前，程序可能需要多次遍历数组。

**问题**：bubbleSort函数的功能是否适合乱序执行呢？我认为答案肯定是否。虽然数组可以拆解成一个个小数组，并且可以对小数组分别进行排序。但是，在每个小数组都排完序后，没有很高效的办法可以将这些排完序的小数组合并。

下面是一个并发版的冒泡排序。

**Listing 8**

	01 func bubbleSortConcurrent(goroutines int, numbers []int) {
	02     totalNumbers := len(numbers)
	03     lastGoroutine := goroutines - 1
	04     stride := totalNumbers / goroutines
	05
	06     var wg sync.WaitGroup
	07     wg.Add(goroutines)
	08
	09     for g := 0; g < goroutines; g++ {
	10         go func(g int) {
	11             start := g * stride
	12             end := start + stride
	13             if g == lastGoroutine {
	14                 end = totalNumbers
	15             }
	16
	17             bubbleSort(numbers[start:end])
	18             wg.Done()
	19         }(g)
	20     }
	21
	22     wg.Wait()
	23
	24     // Ugh, we have to sort the entire list again.
	25     bubbleSort(numbers)
	26 }

在List8中，bubbleSortConcurrent是并发版的bubbleSort，它将大数组拆成若干小数组，使用并发的方式对小数组进行排序。但是，你得到的是一块一块的局部有序数组。假设数组有36个元素，按12个一组进行排序。下面就是在25行前的结果：

**Listing 9**

	Before:
	  25 51 15 57 87 10 10 85 90 32 98 53
	  91 82 84 97 67 37 71 94 26  2 81 79
	  66 70 93 86 19 81 52 75 85 10 87 49
	
	After:
	  10 10 15 25 32 51 53 57 85 87 90 98
	   2 26 37 67 71 79 81 82 84 91 94 97
	  10 19 49 52 66 70 75 81 85 86 87 93

在25行，你还得对整个数组进行排序(或者用其它合并方法)。

由于冒泡排序的本质就是遍历数组，交换元素。第25行如果对整个数组再排序的话会把前面并发取得的收益都搭进去赔掉。所以，就冒泡排序这种场景而言，并发不会带来任何性能收益。
读文件

前面已经通过示例讲述了CPU约束型工作，那I/O约束型工作是怎样的呢？让我们来看一个读文件并从中搜索文本的I/O约束型任务CASE。

第一个版本是一个串行版本。

**Listing 10**
Playground: https://play.golang.org/p/8gFe5F8zweN

	42 func find(topic string, docs []string) int {
	43     var found int
	44     for _, doc := range docs {
	45         items, err := read(doc)
	46         if err != nil {
	47             continue
	48         }
	49         for _, item := range items {
	50             if strings.Contains(item.Description, topic) {
	51                 found++
	52             }
	53         }
	54     }
	55     return found
	56 }

在List10中，你看到的是一个串行版的find函数。在Line43，定义了一个叫做found的变量来记录查找到某个特殊字符topic在给定文档中出现的次数。然后在Line44中，遍历各个文档，在Line45行读取各个文档的内容。在Line49-53中，strings包中的Contains函数用于查找给定字符是否再文档内容中。如果查找到了指定字符，则found变量加1。

下面是find函数中调用的read函数的具体实现。

**Listing 11**

https://play.golang.org/p/8gFe5F8zweN

	33 func read(doc string) ([]item, error) {
	34     time.Sleep(time.Millisecond) // Simulate blocking disk read.
	35     var d document
	36     if err := xml.Unmarshal([]byte(file), &d); err != nil {
	37         return nil, err
	38     }
	39     return d.Channel.Items, nil
	40 }

**List11**中的read函数最开始调用time.Sleep阻塞1ms。这主要用来模拟发从磁盘读取文件这一系统调用带来的延迟。延迟的一致性对于测量串行和并发2个版本find的性能很重要。在Line35-39中，全局变量file中存储的内容被xml.Unmarshal。最终返回结果集。

上面给出了串行版的，那下面则是并发版的。

> **注意**: 有很多种形式写find函数的并发版，不要吊死在我这一种实现方式上。如果你找到更好的方式了，欢迎与我分享。

**Listing 12**

https://play.golang.org/p/8gFe5F8zweN

	58 func findConcurrent(goroutines int, topic string, docs []string) int {
	59     var found int64
	60
	61     ch := make(chan string, len(docs))
	62     for _, doc := range docs {
	63         ch <- doc
	64     }
	65     close(ch)
	66
	67     var wg sync.WaitGroup
	68     wg.Add(goroutines)
	69
	70     for g := 0; g < goroutines; g++ {
	71         go func() {
	72             var lFound int64
	73             for doc := range ch {
	74                 items, err := read(doc)
	75                 if err != nil {
	76                     continue
	77                 }
	78                 for _, item := range items {
	79                     if strings.Contains(item.Description, topic) {
	80                         lFound++
	81                     }
	82                 }
	83             }
	84             atomic.AddInt64(&found, lFound)
	85             wg.Done()
	86         }()
	87     }
	88
	89     wg.Wait()
	90
	91     return int(found)
	92 }

在List12中，findConcurrent就是并发版的find。并发版使用30行代码，串行版使用13行。

同样，这里的并发版本看起来比非并发版本也要复杂不少，那这样做又是否有价值呢？回答这个问题的最好方式还是写一些benchmark测试一下。这里选取1000个文档集作为测试数据并且把垃圾回收关闭掉。下面就分别是一个串行版find和并发版findConcurrent的benchmark函数。

**Listing 13**

	func BenchmarkSequential(b *testing.B) {
	    for i := 0; i < b.N; i++ {
	        find("test", docs)
	    }
	}
	
	func BenchmarkConcurrent(b *testing.B) {
	    for i := 0; i < b.N; i++ {
	        findConcurrent(runtime.NumCPU(), "test", docs)
	    }
	}

**Listing 13**展示的就是2个对应的benchmark的实现。下面是在只有一个OS/硬件线程情况下的运行结果。串行版只使用一个Go协程，并发版使用了runtime.NumCPU 个协程(在本文作者机器上这个数字是8)。在这种场景下，并发版本是以非并行的方式进行并发的。

**Listing 14**

	10 Thousand Documents using 8 goroutines with 1 core
	2.9 GHz Intel 4 Core i7
	Concurrency WITHOUT Parallelism
	-----------------------------------------------------------------------------
	$ GOGC=off go test -cpu 1 -run none -bench . -benchtime 3s
	goos: darwin
	goarch: amd64
	pkg: github.com/ardanlabs/gotraining/topics/go/testing/benchmarks/io-bound
	BenchmarkSequential                     3        1483458120 ns/op
	BenchmarkConcurrent                    20         188941855 ns/op : ~87% Faster
	BenchmarkSequentialAgain                2        1502682536 ns/op
	BenchmarkConcurrentAgain               20         184037843 ns/op : ~88% Faster

**Listing 14** 在只有一个OS/硬件线程的情况下，并发版本的find比串行版本的快约87%~88%。可能你会有点惊讶，但这确是符合预期的。因为在只有一个OS/硬件线程的情况下，并发版本的多个Go协程可以高效的共享这一个OS/硬件线程。这是因为在调用read的时候发生的是自然的上下文切换，这使得随着时间推移，这个OS/硬件线程可以处理更多的工作。

下面是以并行的形式进行并发的结果：

**Listing 15**

	10 Thousand Documents using 8 goroutines with 1 core
	2.9 GHz Intel 4 Core i7
	Concurrency WITH Parallelism
	-----------------------------------------------------------------------------
	$ GOGC=off go test -run none -bench . -benchtime 3s
	goos: darwin
	goarch: amd64
	pkg: github.com/ardanlabs/gotraining/topics/go/testing/benchmarks/io-bound
	BenchmarkSequential-8                       3        1490947198 ns/op
	BenchmarkConcurrent-8                      20         187382200 ns/op : ~88% Faster
	BenchmarkSequentialAgain-8                  3        1416126029 ns/op
	BenchmarkConcurrentAgain-8                 20         185965460 ns/op : ~87% Faster

Listing 15中的benchmark结果显示，使用更多的OS/硬件线程并不会带来更佳的性能。

### 总结
本篇文章的目的是让你对“什么样的工作适合使用并发”有个基本的概念。这里尝试使用不同类型的算法示例来讲述在工程实现中面对不同负载类型时不同的考量。

你可以很清晰的看到，对于IO约束型负载，采用并行并不能带来很大的性能提升。这与CPU约束型工作正好相反。而当遇到类似冒泡排序这样的算法的时候，使用并发不仅会给程序带来复杂性，也不会带来任何收益。所以判断你所面对的负载类型是否适合使用并发非常重要。
