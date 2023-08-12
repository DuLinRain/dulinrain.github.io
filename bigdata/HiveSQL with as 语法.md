# HiveSQL with as 语法
- 含义（What）: 把一个常用SQL片段，当做一个表的别名放到全局使用。也通常称为公用表表达式 (CTE，Common Table Expression)或子查询重构。
- 好处（Why）：
  - 可以提高SQL语句的可读性，减少嵌套冗余。常用在有JOIN或者子查询的场景。
  - 提高性能。“一次分析，多次使用”
- 场景（Where）:  JOIN或者子查询。
- 怎么用（How）: 

### 语法
```SQL
-- CTE简单用法
WITH 临时表名 AS (SQL片段)
-- CTE同时多个
WITH 
临时表名1 AS (SQL片段1),
临时表名2 AS (SQL片段2)

-- CTE指定临时表的虚拟列名, 虚拟列名可以在后面使用
WITH 
临时表名1(col1_1, col1_2, ....) AS (SQL片段1),
临时表名2(col2_1, col2_2, ....) AS (SQL片段2)
```
### 示例1
-- 把查询age<10的age,name SQL保存为一个片段
```SQL
WITH A AS (
    SELECT name, age FROM XXX WHERE age < 10;
)
SELECT name FROM A; // 使用 这个片段
```
### 示例2
-- 求每种商品的平均评分。
-- 先聚合每种商品的评分
-- 再对评分求均值
```SQL
WITH QUANTITY AS (
    SELECT sum(quatity) AS total FROM TB GROUP BY good_id
)
SELECT AVG(total) FROM QUANTITY
```
### 示例3
```SQL
// 计算员工(EmployeeId)卖出商品(ShipperID)2和商品3的平均件数
WITH all_shipper_sales AS (
    SELECT EmployeeId, count(OrderId) as Orders, ShipperID FROM TB GROUP BY EmployeeId, ShipperID
), 
shipper_sales AS (
    SELECT * FROM all_shipper_sales WHERE ShipperID = 2 OR ShipperID = 3
)
SELECT ShipperID, AVG(Orders) AS avg_orders FROM shipper_sales GROUP BY ShipperID
```
### 参考
- https://learnsql.com/blog/what-is-with-clause-sql/
