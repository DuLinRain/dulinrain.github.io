

type和interface都能定义对象，但是他们在语法和功能上有一些差别：
- type和interface语法上是不一样的
- interface可以被继承，type不可以被继承
- type可以通过交并差的方式建立复杂的类型
- interface支持声明合并，type不支持
React组件属性用type还是用interface?
- 组件属性用interface更合适，因为非常适合继承用，比如定义IBaseProps
- type更适合用于组件属性的某个具体属性的类型

### 参考
-   https://levelup.gitconnected.com/mastering-typescript-a-guide-to-choosing-between-type-and-interface-c31d3527693b
