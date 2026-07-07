---
title: "《动手学深度学习》3.3 — 线性回归的简洁实现"
date: "2026-07-07"
tags: ["Deep Learning", "d2l"]
excerpt: "使用 PyTorch 高级 API 简洁地实现线性回归：DataLoader、nn.Linear、MSELoss、optim.SGD，代码量减少 60%。"
series: "d2l"
seriesOrder: 2
---

## 代码框 1：导入

```python
import numpy as np
import torch
from torch.utils import data
from d2l import torch as d2l
```

比 3.2 节多了 `torch.utils.data`，用来做自动分批加载。

## 代码框 2：造假数据

```python
true_w = torch.tensor([2, -3.4])
true_b = 4.2
features, labels = d2l.synthetic_data(true_w, true_b, 1000)
```

和 3.2 节一样，造 1000 条数据，真实公式 y = 2x₁ − 3.4x₂ + 4.2。

## 代码框 3：用 DataLoader 取数据

```python
def load_array(data_arrays, batch_size, is_train=True):
    """构造一个PyTorch数据迭代器"""
    dataset = data.TensorDataset(*data_arrays)
    return data.DataLoader(dataset, batch_size, shuffle=is_train)
```

`TensorDataset` 把 features 和 labels 打包成数据集。`DataLoader` 自动分批、自动洗牌。

```python
batch_size = 10
data_iter = load_array((features, labels), batch_size)
```

3.2 节自己写了 `data_iter` 函数（洗牌 + yield），这里一行搞定。

## 代码框 4：定义模型

```python
from torch import nn

net = nn.Sequential(nn.Linear(2, 1))
```

`nn.Linear(2, 1)` = 全连接层，输入 2 个特征，输出 1 个值。等价于 3.2 节的 `X @ w + b`，但参数自动管理。

## 代码框 5：初始化参数

```python
net[0].weight.data.normal_(0, 0.01)
net[0].bias.data.fill_(0)
```

`net[0]` 访问第一层，`.weight.data` 拿权重数据，`.normal_(0, 0.01)` 用正态分布填充。下划线 `_` 结尾 = 原地操作，直接改原张量。

## 代码框 6：定义损失函数

```python
loss = nn.MSELoss()
```

均方误差，公式 loss = mean((ŷ − y)²)。3.2 节自己写的没除以 n，这个默认取平均。

## 代码框 7：定义优化器

```python
trainer = torch.optim.SGD(net.parameters(), lr=0.03)
```

SGD 优化器，自动管理 `net` 里所有参数。3.2 节要手动 `sgd([w, b], lr)`，这里 `trainer.step()` 一行搞定。

## 代码框 8：训练

```python
num_epochs = 3

for epoch in range(num_epochs):
    for X, y in data_iter:
        l = loss(net(X), y)          # 前向传播：算损失
        trainer.zero_grad()          # 清空梯度
        l.backward()                 # 反向传播：算梯度
        trainer.step()               # 更新参数
    l = loss(net(features), labels)  # 算整个数据集的损失
    print(f'epoch {epoch + 1}, loss {l:f}')
```

和 3.2 节对比：
- `net(X)` 不用手动传 w, b
- `trainer.zero_grad()` 替代 `param.grad.zero_()`
- `trainer.step()` 替代手动 `param -= lr * grad`

## 代码框 9：检验结果

```python
w = net[0].weight.data
print('w的估计误差：', true_w - w.reshape(true_w.shape))

b = net[0].bias.data
print('b的估计误差：', true_b - b)
```

输出误差接近 0，说明学到了正确答案。

## 3.2 vs 3.3 总结

| 组件 | 3.2 从零开始 | 3.3 简洁实现 |
|------|-------------|-------------|
| 数据加载 | 手写 data_iter | DataLoader |
| 模型 | 手写 X @ w + b | nn.Linear |
| 损失函数 | 手写 squared_loss | nn.MSELoss |
| 优化器 | 手写 sgd() | optim.SGD |
| 代码量 | ~29 行 | ~12 行 |

3.2 节理解原理，3.3 节提高效率，两个都要会。
