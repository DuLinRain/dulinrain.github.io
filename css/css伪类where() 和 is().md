# css伪类where() 和 is()
:where() 和 :is()都是css的伪类选择器，用于选定一堆选择器列表，并且具有可容错性。

### 基础用法

```css
// 会选定所有header 或 main 或footer下的p且悬浮到的p元素
:where(header, main, footer) p:hover {
  color: red;
  cursor: pointer;
}

```

```css

/* 上面的例子与下面等效 */
header p:hover,
main p:hover,
footer p:hover {
  color: red;
  cursor: pointer;
}

```

### 可容错性是什么意思？
可容性意味着，如果选择器列表中有不支持的选择器，整个列表不会失效。下面这2个写法基本上等效，但是第一种具有可容错性，第二种不具有。假设有浏览器不支持:unsupported属性，那么第二个会导致整个选择器都失效，第一个则不会

```css

:is(:valid, :unsupported) {
  /* … */
}

valid, :unsupported {
 /* … */
}
```

### :where() 和 :is() 的区别
:where() 和 :is() 用法上基本上没什么区别，但是优先级有区别。:is()的优先级由选择器列表综合判定，而:where()则优先级为0，其它样式很容易覆盖:where()选择器列表带来的样式。比如

```css

  <footer class="where-styling">
    <p>
      This is my footer, also containing
      <a href="https://github.com/mdn">a link</a>.
    </p>
  </footer>
  
  <footer class="is-styling">
    <p>
      This is my footer, also containing
      <a href="https://github.com/mdn">a link</a>.
    </p>
  </footer>
  
  :is(section.is-styling, aside.is-styling, footer.is-styling) a {
	  color: red;
  }
	
  :where(section.where-styling, aside.where-styling, footer.where-styling) a {
	  color: orange;
  }
  // 这个样式无法覆盖is，但是能覆盖where
  footer a {
	  color: blue;
  }

```

