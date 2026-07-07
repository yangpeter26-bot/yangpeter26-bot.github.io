# 线性回归的简洁实现：用 PyTorch 高级 API 优雅地实现线性回归

> 本文是《动手学深度学习》3.3 节的学习笔记，详细讲解如何使用 PyTorch 的高级 API 简洁地实现线性回归模型。

## 📖 前言

在上一节（3.2 节）中，我们从零开始实现了线性回归，包括数据加载、模型定义、损失函数、优化算法等所有组件。虽然这种方式有助于理解底层原理，但在实际项目中，每次都从零开始写会非常低效。

本节将介绍如何使用 PyTorch 的高级 API 来简洁地实现同样的线性回归模型。你会发现，代码量大大减少，但功能完全一样！

---

## 🎯 目录

1. [导入必要的库](#1-导入必要的库)
2. [生成数据集](#2-生成数据集)
3. [读取数据集：使用 DataLoader](#3-读取数据集使用-dataloader)
4. [定义模型：使用 nn.Linear](#4-定义模型使用-nnlinear)
5. [初始化模型参数](#5-初始化模型参数)
6. [定义损失函数：使用 nn.MSELoss](#6-定义损失函数使用-nnmselesss)
7. [定义优化算法：使用 torch.optim.SGD](#7-定义优化算法使用-torchoptimsgd)
8. [训练模型](#8-训练模型)
9. [检验训练结果](#9-检验训练结果)
10. [3.2 vs 3.3 对比总结](#10-32-vs-33-对比总结)
11. [核心思想与学习建议](#11-核心思想与学习建议)

---

## 1. 导入必要的库

```python
import numpy as np
import torch
from torch.utils import data
from d2l import torch as d2l
```

### 代码解释

| 库 | 作用 | 说明 |
|---|---|---|
| `numpy` | 科学计算 | 用于数组操作和数学运算 |
| `torch` | PyTorch 核心库 | 张量计算、自动微分等 |
| `torch.utils.data` | 数据加载工具 | 提供 `Dataset` 和 `DataLoader` |
| `d2l` | 《动手学深度学习》配套库 | 提供一些常用的辅助函数 |

### 💡 小贴士

`torch.utils.data` 是 PyTorch 中非常重要的模块，它提供了：
- `TensorDataset`：将张量打包成数据集
- `DataLoader`：自动分批、洗牌、并行加载数据

---

## 2. 生成数据集

```python
true_w = torch.tensor([2, -3.4])  # 真实的权重
true_b = 4.2                       # 真实的偏置
features, labels = d2l.synthetic_data(true_w, true_b, 1000)  # 生成1000个样本
```

### 代码解释

**第 1 行**：定义真实的权重向量
- `true_w = torch.tensor([2, -3.4])` 表示：
  - 第一个特征的权重是 2
  - 第二个特征的权重是 -3.4
- 这是我们要让模型学习的目标

**第 2 行**：定义真实的偏置
- `true_b = 4.2` 是常数项
- 相当于线性方程 y = wx + b 中的 b

**第 3 行**：生成合成数据
- `d2l.synthetic_data()` 函数会：
  1. 生成 1000 个样本，每个样本有 2 个特征
  2. 使用公式 `y = Xw + b` 计算标签
  3. 添加一些随机噪声（模拟真实世界的误差）
- 返回值：
  - `features`：形状为 (1000, 2) 的张量，表示 1000 个样本的特征
  - `labels`：形状为 (1000, 1) 的张量，表示对应的标签

### 📊 数据示例

假设我们用这个模型预测房价：
- 特征 1：房屋面积（权重 = 2）
- 特征 2：房龄（权重 = -3.4）
- 偏置：基础价格 = 4.2

公式：`房价 = 2 × 面积 + (-3.4) × 房龄 + 4.2 + 噪声`

---

## 3. 读取数据集：使用 DataLoader

### 3.1 定义数据加载函数

```python
def load_array(data_arrays, batch_size, is_train=True):
    """构造一个PyTorch数据迭代器"""
    dataset = data.TensorDataset(*data_arrays)  # 将数据打包成数据集
    return data.DataLoader(dataset, batch_size, shuffle=is_train)  # 创建数据加载器
```

### 代码详解

**第 1 行**：函数定义
- 参数 `data_arrays`：一个元组，包含特征和标签
- 参数 `batch_size`：每个小批量的样本数
- 参数 `is_train`：是否在训练模式（训练时需要洗牌）

**第 2 行**：创建数据集
```python
dataset = data.TensorDataset(*data_arrays)
```
- `TensorDataset` 将多个张量打包成一个数据集
- `*data_arrays` 是解包操作，相当于 `data.TensorDataset(features, labels)`
- 这样 `dataset[i]` 就会返回 `(features[i], labels[i])`

**第 3 行**：创建数据加载器
```python
return data.DataLoader(dataset, batch_size, shuffle=is_train)
```
- `DataLoader` 是一个迭代器，每次返回一个小批量数据
- `batch_size=10`：每次返回 10 个样本
- `shuffle=True`：每个 epoch 开始时洗牌（随机打乱顺序）

### 3.2 使用数据加载器

```python
batch_size = 10
data_iter = load_array((features, labels), batch_size)
```

### 3.3 验证数据加载器

```python
next(iter(data_iter))
```

### 代码解释

- `iter(data_iter)`：将 `data_iter` 转换为 Python 迭代器
- `next()`：获取迭代器的下一个元素
- 返回一个小批量的 `(X, y)`，其中：
  - `X` 的形状是 (10, 2)：10 个样本，每个样本 2 个特征
  - `y` 的形状是 (10, 1)：10 个标签

### 💡 对比 3.2 节

在 3.2 节中，我们自己写了 `data_iter` 函数：

```python
# 3.2 节的实现（从零开始）
def data_iter(batch_size, features, labels):
    num_examples = len(features)
    indices = list(range(num_examples))
    random.shuffle(indices)  # 手动洗牌
    for i in range(0, num_examples, batch_size):
        batch_indices = torch.tensor(
            indices[i: min(i + batch_size, num_examples)])
        yield features[batch_indices], labels[batch_indices]
```

**3.3 节的优势**：
- 代码更简洁
- 自动处理洗牌、分批
- 支持多进程并行加载
- 内存效率更高

---

## 4. 定义模型：使用 nn.Linear

```python
from torch import nn

net = nn.Sequential(nn.Linear(2, 1))
```

### 代码详解

**第 1 行**：导入神经网络模块
- `nn` 是 `torch.nn` 的缩写
- 包含了所有神经网络相关的类和函数

**第 2 行**：定义模型
```python
net = nn.Sequential(nn.Linear(2, 1))
```

- `nn.Sequential`：一个容器，按顺序执行多个层
- `nn.Linear(2, 1)`：全连接层（线性层）
  - 第一个参数 `2`：输入特征维度（我们有 2 个特征）
  - 第二个参数 `1`：输出维度（我们要预测 1 个值）

### 🔍 nn.Linear 的数学原理

`nn.Linear(2, 1)` 实际上执行的操作是：

```
y = xw^T + b
```

其中：
- `x`：输入张量，形状为 (batch_size, 2)
- `w`：权重矩阵，形状为 (1, 2)
- `b`：偏置向量，形状为 (1,)
- `y`：输出张量，形状为 (batch_size, 1)

### 💡 对比 3.2 节

在 3.2 节中，我们自己写了模型函数：

```python
# 3.2 节的实现（从零开始）
def linreg(X, w, b):
    """线性回归模型"""
    return torch.matmul(X, w) + b
```

**3.3 节的优势**：
- 使用 PyTorch 内置的层，代码更简洁
- 自动管理参数（权重和偏置）
- 支持 GPU 加速
- 可以轻松堆叠多个层

---

## 5. 初始化模型参数

```python
net[0].weight.data.normal_(0, 0.01)  # 权重从正态分布采样
net[0].bias.data.fill_(0)            # 偏置设为0
```

### 代码详解

**第 1 行**：初始化权重
```python
net[0].weight.data.normal_(0, 0.01)
```
- `net[0]`：访问 `Sequential` 中的第一个层（也就是 `nn.Linear`）
- `.weight`：访问权重参数
- `.data`：访问参数的数据（不包含梯度信息）
- `.normal_(0, 0.01)`：用正态分布填充，均值为 0，标准差为 0.01

**第 2 行**：初始化偏置
```python
net[0].bias.data.fill_(0)
```
- `.bias`：访问偏置参数
- `.fill_(0)`：用 0 填充

### 💡 关于下划线 `_`

在 PyTorch 中，以下划线结尾的函数（如 `normal_()`、`fill_()`）是**原地操作**（in-place operation），会直接修改张量本身，而不是返回一个新的张量。

```python
# 原地操作（修改原张量）
x.normal_(0, 0.01)  # x 本身被修改

# 非原地操作（返回新张量）
x = torch.normal(0, 0.01, x.shape)  # 创建新张量，x 不变
```

### 💡 对比 3.2 节

在 3.2 节中，我们这样初始化参数：

```python
# 3.2 节的实现（从零开始）
w = torch.normal(0, 0.01, size=(2,1), requires_grad=True)
b = torch.zeros(1, requires_grad=True)
```

**3.3 节的优势**：
- 参数已经包含在模型中，不需要单独创建
- 使用 `requires_grad=True` 自动启用梯度计算
- 代码更简洁

---

## 6. 定义损失函数：使用 nn.MSELoss

```python
loss = nn.MSELoss()
```

### 代码解释

- `nn.MSELoss()`：均方误差损失函数
- MSE = Mean Squared Error（均方误差）
- 计算公式：`loss = mean((y_pred - y_true)^2)`

### 🔍 数学原理

均方误差损失函数的定义：

```
L = (1/n) * Σ(y_pred - y_true)^2
```

其中：
- `n`：样本数量
- `y_pred`：预测值
- `y_true`：真实值

### 💡 对比 3.2 节

在 3.2 节中，我们自己写了损失函数：

```python
# 3.2 节的实现（从零开始）
def squared_loss(y_hat, y):
    """均方损失"""
    return (y_hat - y.reshape(y_hat.shape)) ** 2 / 2
```

**注意**：3.2 节的实现没有除以样本数 `n`，而 `nn.MSELoss()` 默认会取平均值。

**3.3 节的优势**：
- 代码更简洁
- 自动处理形状不匹配
- 支持多种损失函数（如 L1 损失、交叉熵损失等）

---

## 7. 定义优化算法：使用 torch.optim.SGD

```python
trainer = torch.optim.SGD(net.parameters(), lr=0.03)
```

### 代码详解

- `torch.optim.SGD`：随机梯度下降优化器
- `net.parameters()`：获取模型的所有参数（权重和偏置）
- `lr=0.03`：学习率（learning rate）

### 🔍 SGD 的工作原理

在每次迭代中，SGD 执行以下操作：

1. 计算损失函数关于参数的梯度
2. 更新参数：`param = param - lr * grad`

### 💡 对比 3.2 节

在 3.2 节中，我们自己写了优化函数：

```python
# 3.2 节的实现（从零开始）
def sgd(params, lr, batch_size):
    """小批量随机梯度下降"""
    with torch.no_grad():
        for param in params:
            param -= lr * param.grad / batch_size
            param.grad.zero_()
```

**3.3 节的优势**：
- 代码更简洁
- 自动处理梯度清零
- 支持多种优化算法（如 Adam、RMSprop 等）
- 支持学习率调度

---

## 8. 训练模型

```python
num_epochs = 3  # 训练3轮

for epoch in range(num_epochs):
    for X, y in data_iter:
        l = loss(net(X), y)          # 1. 前向传播：计算损失
        trainer.zero_grad()          # 2. 清空梯度
        l.backward()                 # 3. 反向传播：计算梯度
        trainer.step()               # 4. 更新参数
    l = loss(net(features), labels)  # 5. 计算整个数据集的损失
    print(f'epoch {epoch + 1}, loss {l:f}')
```

### 代码详解

**外层循环**：遍历每个 epoch
```python
for epoch in range(num_epochs):
```
- `num_epochs = 3`：整个数据集遍历 3 次
- 每个 epoch 开始时，`DataLoader` 会自动洗牌

**内层循环**：遍历每个小批量
```python
for X, y in data_iter:
```
- 每次迭代获取一个小批量的 `(X, y)`
- `X` 的形状：(10, 2)
- `y` 的形状：(10, 1)

**训练步骤**：

```python
# 步骤 1：前向传播
l = loss(net(X), y)
```
- `net(X)`：将输入 X 传入模型，得到预测值
- `loss(net(X), y)`：计算预测值和真实值之间的损失

```python
# 步骤 2：清空梯度
trainer.zero_grad()
```
- PyTorch 默认会累加梯度，所以每次需要清零
- 这是 PyTorch 的设计，方便某些特殊场景（如梯度累积）

```python
# 步骤 3：反向传播
l.backward()
```
- 自动计算损失函数关于所有参数的梯度
- 梯度存储在参数的 `.grad` 属性中

```python
# 步骤 4：更新参数
trainer.step()
```
- 使用梯度下降算法更新参数
- 更新公式：`param = param - lr * grad`

**打印损失**：
```python
l = loss(net(features), labels)
print(f'epoch {epoch + 1}, loss {l:f}')
```
- 每个 epoch 结束后，计算整个数据集的损失
- 监控训练过程，确保损失在下降

### 📊 训练过程示例

```
epoch 1, loss 0.000095
epoch 2, loss 0.000095
epoch 3, loss 0.000095
```

损失值很小，说明模型学得很好！

### 💡 对比 3.2 节

在 3.2 节中，训练代码是这样的：

```python
# 3.2 节的实现（从零开始）
for epoch in range(num_epochs):
    for X, y in data_iter(batch_size, features, labels):
        l = loss(net(X, w, b), y)           # 需要手动传入参数 w, b
        l.sum().backward()                   # 需要 .sum()
        sgd([w, b], lr, batch_size)          # 需要手动调用优化函数
    with torch.no_grad():
        train_l = loss(net(features, w, b), labels)
        print(f'epoch {epoch + 1}, loss {float(train_l.mean()):f}')
```

**3.3 节的优势**：
- 不需要手动传入参数
- 不需要 `.sum()`
- 不需要手动调用优化函数
- 代码更简洁、更易读

---

## 9. 检验训练结果

```python
w = net[0].weight.data
print('w的估计误差：', true_w - w.reshape(true_w.shape))

b = net[0].bias.data
print('b的估计误差：', true_b - b)
```

### 代码详解

**第 1-2 行**：获取学习到的权重
```python
w = net[0].weight.data
print('w的估计误差：', true_w - w.reshape(true_w.shape))
```
- `net[0].weight.data`：获取模型学习到的权重
- `true_w - w.reshape(true_w.shape)`：计算真实权重和学习权重的差值

**第 3-4 行**：获取学习到的偏置
```python
b = net[0].bias.data
print('b的估计误差：', true_b - b)
```
- `net[0].bias.data`：获取模型学习到的偏置
- `true_b - b`：计算真实偏置和学习偏置的差值

### 📊 结果示例

```
w的估计误差： tensor([ 0.0002, -0.0003])
b的估计误差： tensor([0.0005])
```

误差非常小，说明模型成功学习到了真实的参数！

---

## 10. 3.2 vs 3.3 对比总结

### 代码量对比

| 组件 | 3.2 节（从零开始） | 3.3 节（简洁实现） |
|------|-------------------|-------------------|
| 数据加载 | ~10 行 | ~3 行 |
| 模型定义 | ~3 行 | ~1 行 |
| 损失函数 | ~3 行 | ~1 行 |
| 优化算法 | ~5 行 | ~1 行 |
| 训练循环 | ~8 行 | ~6 行 |
| **总计** | **~29 行** | **~12 行** |

### 功能对比

| 功能 | 3.2 节 | 3.3 节 |
|------|--------|--------|
| 自动洗牌 | ❌ 手动实现 | ✅ 自动 |
| 自动分批 | ❌ 手动实现 | ✅ 自动 |
| 梯度清零 | ❌ 手动实现 | ✅ 自动 |
| 参数管理 | ❌ 手动管理 | ✅ 自动 |
| GPU 支持 | ❌ 需要额外代码 | ✅ 内置支持 |
| 多进程加载 | ❌ 不支持 | ✅ 支持 |

### 灵活性对比

| 方面 | 3.2 节 | 3.3 节 |
|------|--------|--------|
| 修改模型 | 需要修改代码 | 只需修改层 |
| 修改损失函数 | 需要重写函数 | 只需换一个类 |
| 修改优化算法 | 需要重写函数 | 只需换一个类 |
| 学习原理 | ✅ 深入理解 | ❌ 黑盒使用 |

---

## 11. 核心思想与学习建议

### 🎯 核心思想

**为什么要学两种方法？**

1. **从零开始（3.2 节）**：
   - 理解底层原理
   - 知道每个步骤在做什么
   - 适合学习和研究

2. **简洁实现（3.3 节）**：
   - 代码更简洁
   - 效率更高
   - 适合实际项目

### 📚 学习建议

1. **先学 3.2 节**：
   - 理解线性回归的原理
   - 理解梯度下降的工作方式
   - 理解 PyTorch 的自动微分

2. **再学 3.3 节**：
   - 学习 PyTorch 的高级 API
   - 提高编码效率
   - 为后续学习更复杂的模型打基础

3. **实践建议**：
   - 尝试修改超参数（学习率、批量大小、epoch 数）
   - 尝试不同的初始化方法
   - 尝试不同的损失函数和优化算法

### 🔮 下一步学习

学完本节后，你可以继续学习：
- 3.4 节：softmax 回归
- 4 章：多层感知机
- 更复杂的神经网络模型

---

## 📝 总结

本节我们学习了如何使用 PyTorch 的高级 API 简洁地实现线性回归：

1. **数据加载**：使用 `DataLoader` 自动分批和洗牌
2. **模型定义**：使用 `nn.Linear` 定义全连接层
3. **损失函数**：使用 `nn.MSELoss` 计算均方误差
4. **优化算法**：使用 `torch.optim.SGD` 进行随机梯度下降
5. **训练过程**：前向传播 → 清空梯度 → 反向传播 → 更新参数

通过对比 3.2 节和 3.3 节，我们理解了：
- 从零开始实现有助于理解原理
- 简洁实现有助于提高效率
- 两种方法都很重要，要根据场景选择

---

## 📚 参考资料

- [《动手学深度学习》官方文档](https://d2l.ai/)
- [PyTorch 官方文档](https://pytorch.org/docs/stable/)
- [3.2 线性回归的从零开始实现](./linear-regression-scratch.ipynb)

---

## 💬 讨论

如果你有任何问题或建议，欢迎在评论区留言！

---

*本文是《动手学深度学习》系列笔记的一部分，持续更新中...*
