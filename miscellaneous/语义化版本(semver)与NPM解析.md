# 语义化版本(semver)与NPM解析

### 什么是语义化版本？
所谓语义化版本就是我们在使用npm包或其它软件时常看到的版本号。它的版本号格式通常由 **主版本号.次版本号.修订号** 3部分组成，各版本号递增规则如下：

1. 主版本号(**major**)：当你做了**不兼容**的修改，
2. 次版本号(**mirror**)：当你做了**向下兼容**的**功能性新增**，
3. 修订号(**patch**)：当你做了**向下兼容**的**问题修正**。

测试用等先行版本号（如alpha版，beta版等）及版本编译信息可以加到“**主版本号.次版本号.修订号**”的后面，作为延伸。

### 每部分版本号可以由哪些数字组成？
每部分版本号可以由**非负数**的任意**阿拉伯数字**组成，可以是**0**，但是**不能**在前面再**补0**，每部分**递增**。

### 开发一个包初始化版本为多少合适？
当新开发一个包时，初始化版本最好是**0.1.0**。在后续每次迭代中增加**次版本号**，在每次修复中增加修订版本号，整体稳定上线后增加主版本号。
### 什么时候是1.0.0版本的正式时机？

有以下几个情况都可以作为**1.0.0**版本的诞生时机：

- 当你的软件被用于正式环境，它应该已经达到了 1.0.0 版。
- 如果你已经有个稳定的 API 被使用者依赖，也会是 1.0.0 版。
- 如果你很担心向下兼容的问题，也应该算是 1.0.0 版了。

### 先行版本的格式要求？
先行版本通常用来做测试用，版本格式是在**`X.Y.Z`**之后加上一个连接号（**`-`**）后面再跟以点号（**`.`**）分隔的标识符，标识符由 ASCII 字母数字和连接号 [0-9A-Za-z-] 组成，并且禁止留白和补零。即：

	X.Y.Z-[0-9A-Za-z-]

范例：`1.0.0-alpha`、`1.0.0-alpha.1`、`1.0.0-0.3.7`、`1.0.0-x.7.z.92`。

先行版本的优先级会**低于**不带先行版本对应的标准版本。即
`1.0.0-alpha`版本优先级低于`1.0.0`。

### NPM中安装包时不同符号的匹配规则？
- 波浪号（如**`~X.Y.Z`**）。
  - 如果有次版本，则匹配主版本相同&次版本+1范围内的所有修订版本。
    - 如`~1.2.3` 匹配`>=1.2.3 <1.3.0`。
  - 如果没有次版本，则匹配主版本+1范围内的所有次版本和修订版本。如~1匹配>=1.0<2.0.0的所有版本。
- 尖头号（如**`^X.Y.Z`**）。
  - 从左往右第一个非0的版本保持不变，其它任意匹配。如
    - `^1.2.3 := >=1.2.3 <2.0.0-0`
    - `^0.2.3 := >=0.2.3 <0.3.0-0`
    - `^0.0.3 := >=0.0.3 <0.0.4-0`
    - `^1.2.3-beta.2 := >=1.2.3-beta.2 <2.0.0-0`
- 星号（**`*X.Y.Z`**）。匹配任意版本。
- `x`号。匹配任意对应位置（次/修订）的版本，主版本不能使用x，如果需要可使用**`*`**。
  - `1.x := >=1.0.0 <2.0.0-0`
  - `1.2.x := >=1.2.0 <1.3.0-0`
- 大于号（**`>X.Y.Z`**）。匹配高于这个版本的版本
- 大于等于号（**`>=X.Y.Z`**）。匹配高于或等于这个版本的版本
- 小于号（**`<X.Y.Z`**）。匹配低于这个版本的版本
- 小于等于号（**`<X.Y.Z`**）。匹配低于或等于这个版本的版本
- 等于号（**`=X.Y.Z`**）。匹配等于这个版本的版本
- latest。匹配最新发布的版本。

### 参考

- https://semver.org/lang/zh-CN/
- https://github.com/npm/node-semver#caret-ranges-123-025-004