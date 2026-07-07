---
title: "《动手学深度学习》3.2 — 线性回归的从零实现"
date: "2026-06-23"
tags: ["Deep Learning", "d2l"]
excerpt: "d2l 3.2 节从头实现线性回归：造数据、取批次、定义模型、损失函数、SGD、训练循环。逐行人话翻译。"
series: "d2l"
seriesOrder: 1
---

以下是 d2l 3.2 节逐行翻译，对照 Jupyter Notebook 食用。

## 代码框 1：导入

```python
%matplotlib inline                    # 让画图显示在 Jupyter 里
import random                         # 用来打乱数据顺序
import torch                          # 深度学习核心库
from d2l import torch as d2l          # 书自带工具包
```

## 代码框 2：造假数据

```python
def synthetic_data(w, b, num_examples):
```

定义函数，功能：根据 w 和 b 生成数据

```python
    X = torch.normal(0, 1, (num_examples, len(w)))
```

`torch.normal(均值, 标准差, 形状)` — 生成随机数。这里生成均值 0、标准差 1 的随机数，形状是 (1000 行, 2 列)，即 1000 条数据，每条有 2 个特征。

```python
    y = X @ w + b
```

`@` 是矩阵乘法。`X` 是 1000×2，`w` 是 2×1 → 结果 1000×1。就是：第 1 个特征 × w1 + 第 2 个特征 × w2，再加 b。**这条就是 y = 4x₁ − 3x₂ + 2，但我们假装不知道。**

```python
    y += torch.normal(0, 0.01, y.shape)
```

给 y 加一点随机噪音，模拟现实中的数据误差 — 真实的房价不可能完美符合公式嘛。

```python
    return X, y.reshape((-1, 1))
```

返回 X 和 y。`.reshape((-1, 1))` 把 y 变成 (1000, 1) 的列向量。

```python
true_w = torch.tensor([4.0, -3.0])     # 真正的权重（我们假装不知道）
true_b = 2.0                            # 真正的偏置（我们假装不知道）
X, y = synthetic_data(true_w, true_b, 1000)  # 造1000条数据
print(f'X: {X.shape}, y: {y.shape}')   # X是(1000,2), y是(1000,1)
```

## 代码框 3：取数据

```python
def data_iter(X, y, batch_size):
```

每次从全部数据里取一小批出来。

```python
    n = len(X)                          # 总共有多少条数据（1000）
    indices = list(range(n))            # [0, 1, 2, 3, ..., 999]
    random.shuffle(indices)             # 打乱顺序，像洗牌
```

```python
    for i in range(0, n, batch_size):   # 从0开始，每次跳batch_size步
```

`range(0, 1000, 10)` = 0, 10, 20, 30, ..., 990，每次取 10 条。

```python
        batch_idx = torch.tensor(
            indices[i: i + batch_size])     # 取第i到第i+10个下标
```

`indices[0:10]` = 洗牌后的前 10 个索引。

```python
        yield X[batch_idx], y[batch_idx]    # 返回这一批的X和y
```

`yield` = 返回一批数据，下次调用时从这继续，不是一次性返回全部，而是一批一批给。

```python
batch_size = 10       # 每批10条
```

## 代码框 4：初始化参数

```python
w = torch.normal(0, 0.01, size=(2, 1), requires_grad=True)
```

随机生成一个 2 行 1 列的 w，值接近 0。`requires_grad=True` = **告诉 PyTorch：这个变量的梯度要帮我算**。

```python
b = torch.zeros(1, requires_grad=True)
```

b 初始化为 0，也要求梯度。

## 代码框 5：定义模型

```python
def linreg(X, w, b):
    return X @ w + b
```

线性回归就是：输入 × 权重 + 偏置。`X @ w` = 矩阵乘法，等价于每行和 w 做点积。

## 代码框 6：定义损失函数

```python
def squared_loss(y_pred, y):
    return ((y_pred - y) ** 2) / 2
```

预测值减真实值，平方，除以 2。

## 代码框 7：定义更新函数

```python
def sgd(params, lr):
```

sgd = 随机梯度下降，params 是要更新的参数（w 和 b）。

```python
    with torch.no_grad():
```

下面操作不需要算梯度（因为我们在手动更新参数，不需要自动追踪）。

```python
        for param in params:
            param -= lr * param.grad
```

每个参数 = 原值 − 学习率 × 梯度。`param.grad` = 之前 `backward()` 自动算好的梯度。

```python
            param.grad.zero_()
```

梯度清零。不清的话下次会叠加，就错了。

```python
lr = 0.03           # 学习率：每次调整的步长
```

## 代码框 8：训练

```python
num_epochs = 3      # 把全部数据看3遍
```

epoch = 一轮 = 把所有数据学一遍。

```python
for epoch in range(num_epochs):
```

循环 3 次，每轮把所有数据学一遍。

```python
    for X_batch, y_batch in data_iter(X, y, batch_size):
```

每次拿 10 条数据。

```python
        loss = squared_loss(linreg(X_batch, w, b), y_batch)
```

1. `linreg(数据, w, b)` → 用当前的 w, b 预测
2. `squared_loss(预测, 真实)` → 算误差

```python
        loss.sum().backward()
```

`loss.sum()` = 把 10 条数据的误差加一起。`backward()` = **自动算 w 和 b 的梯度**。

```python
        sgd([w, b], lr)
```

用梯度更新 w 和 b。

```python
    with torch.no_grad():
        total_loss = squared_loss(linreg(X, w, b), y)
        print(f'第 {epoch+1} 轮, 总损失: {total_loss.mean():.4f}')
```

训练完一轮后，用全部数据算一次总误差，看看进步了没。

```python
print(f'\n训练出的 w: {w.tolist()}, 真实的 w: {true_w.tolist()}')
print(f'训练出的 b: {b.item():.4f},  真实的 b: {true_b}')
```

最后打印：我们学到的 w, b 和真实的 w, b 对比。

## 流程图

```
造数据 (w=4, b=-3, 但我们不知道)
   ↓
随便猜 w≈0, b=0
   ↓
拿10条数据
   ↓
预测 → 算误差 → backward算梯度 → 调 w,b  ← 重复，误差越来越小
   ↓
3轮后：w≈[4, -3], b≈2  ← 从数据中学到了正确答案！
```
