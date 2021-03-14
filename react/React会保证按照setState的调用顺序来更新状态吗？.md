# React会保证按照setState的调用顺序来更新状态吗？

我们都知道，React可能异步进行状态更新，并且会使用批量渲染来提升性能。因此在调用`setState`立刻去拿到的`state`是永远不可信任的。但是我们是否可以信任React按照我们调用`setState`的顺序去更新`state`呢？并且在下面2中情况都是一样的吗?

1. 在相同组件中？
2. 在不同组件中？


### 1. 对于下面的代码，是否可能出现a为false、b为true的可能?

	class Container extends React.Component {   
	    constructor(props) {     
	    super(props);     
	        this.state = { a: false, b: false };   
	    }    
	    render() {     
	        return <Button onClick={this.handleClick}/>   
	    }    
	    handleClick = () => {     
	        this.setState({ a: true });     
	        this.setState({ b: true });   
	    } 
	}
	
### 2. 对于下面的代码，是否可能出现a为false、b为true的可能?

	class SuperContainer extends React.Component {   
	    constructor(props) {     
	        super(props);     
	        this.state = { a: false };   
	    }    
	    render() {     
	        return <Container setParentState={this.setState.bind(this)}/>   
	    }
	}  
	class Container extends React.Component {   
	    constructor(props) {     
	        super(props);     
	        this.state = { b: false };   
	    }    
	    render() {     
	        return <Button onClick={this.handleClick}/>   
	    }    
	    handleClick = () => {     
	        this.props.setParentState({ a: true });     
	        this.setState({ b: true });   
	    } 
	}
	
	
对于以上2个问题，答案都是**肯定的**。

这个更新的**顺序**是**肯定会保证**的，至于你能否看到中间状态，取决于你是否处于批量更新中。

React16以及之前，**只有在React事件处理器内部的更新是默认批量进行的**。也有一个不稳定的API用于在事件处理器之外进行强制批量更新，但很少情况需要用到。

在未来的版本（React17以及之后）里，React默认将会把所有的更新操作都批量进行，所以你不需要考虑这个问题。

理解这个问题的关键在于**无论你在多少个组件的事件处理器中调用多少次`setState()`, 它们只会在事件结束后产生一个重新渲染**。这对于规模较大的应用的性能而言至关重要，因为如果Child 和 Parent在处理点击事件的时候分别调用`setState()`，你不希望重新渲染Child组件2次。

在上面的两个例子中，`setState()`的调用发生在React事件处理器中，因此他们都是在事件结束的时候一起被处理（并且你看不到中间过程）。

更新总是**按照他们发生的顺序进行浅合并**。所以如果第一次`setState()`是`{a: 10}`，第二次是`{b: 20}`，第三次是`{a: 30}`，被渲染的`state`会是`{a: 30, b: 20}`。最近更新的`key`会作为终极结果生效。

`this.state`对象会在批量更新重新渲染UI之后进行更新。所以，如果你需要基于前面的`state`（如计数器+1）来更新`state`，那么你需要使用`setState(fn)`这个版本来更新，这样会把之前的状态给你，而不是读取`this.state`。如果你对这个点比较感兴趣，可以查看这里我对它的详细解释。

在上面的例子中，我们看不到中间状态，因为我们是在React事件处理器中，在这里更新默认是批量进行的（因为React知道我们何时离开这个事件）。

然而，在React 16及其早期版本中，对于在React事件处理器之外的地方进行的`setState()`默认是不会有批量更新的。所以，如果在上面例子中有一个AJAX响应处理器，并且在里面调用`setState()`，那么每次调用`setState()`的时候都会立即进行更新。在这种情况下，你可能会看到中间状态：

	promise.then(() => {   
	    // We're not in an event handler, so these are flushed separately.   
	    this.setState({a: true}); 
	    // Re-renders with {a: true, b: false }   
	    this.setState({b: true}); 
	    // Re-renders with {a: true, b: true }   
	    this.props.setParentState(); 
	    // Re-renders the parent 
	});
	
React团队意识到「在不在React事件处理器中会导致不同的行为」这个事情会带了很多不便，这可能在未来版本中做出改变——可能会对所有的跟新都批量进行处理，不论是不是在React事件处理器中并且也提供一个可选的API用于同步的刷新变化。在切到这个可能的版本之前，你可以使用一个API来强制批量更新：

	promise.then(() => {   
	    // Forces batching   
	    ReactDOM.unstable_batchedUpdates(() => {     
	        this.setState({a: true}); // Doesn't re-render yet     
	        this.setState({b: true}); // Doesn't re-render yet     
	        this.props.setParentState(); // Doesn't re-render yet   
	    });   
	    // When we exit unstable_batchedUpdates, re-renders once 
	});
	
在React内部，所有的事件处理器都被`unstable_batchedUpdates`包裹，这就是为什么事件处理器中的`setState`被默认批量处理。注意，用`unstable_batchedUpdates`包裹2次是没有用的，最终的更新会在跳出最外一层的`unstable_batchedUpdates`发生。

这个API被标记为"unstable"意味着在批量更新对所有场景都是默认生效的情况下会被删掉。然而，React不会在次版本中删除它。所以，如果你在React 17之前的版本中想在某些情况下强制批量渲染，你可以安全的使用它。

### 总结
这是一个非常令人困惑的话题，因为React默认只会在事件处理器中进行批量渲染。这可能在未来的版本中做出改变。