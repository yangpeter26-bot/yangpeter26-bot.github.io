---
title: "《动手学深度学习》3.4 — Softmax 回归与分类问题"
date: "2026-07-09"
tags: ["Deep Learning", "d2l"]
excerpt: "Softmax 回归完整详解：从线性回归到分类问题，Softmax 函数手算演示，交叉熵损失，Fashion-MNIST 数据集，从零实现与 PyTorch 简洁实现。"
series: "d2l"
seriesOrder: 3
---

## Softmax 回归解决什么问题

| | 线性回归 | Softmax 回归 |
|------|---------|------------|
| 回答的问题 | "多少？" | "哪一个？" |
| 举例 | 房价多少钱？ | 这是猫还是狗？ |
| 输出 | 1 个数字 | 每个类别的概率 |
| 损失函数 | 平方损失 | 交叉熵 |

```
场景：Fashion-MNIST 衣服识别
  输入：28×28 灰度图片
  输出：[T恤 5%, 裤子 85%, 套头衫 3%, ... 等 10 个概率]
  → 概率最高的是"裤子"
```

---

## 从线性回归到 Softmax 回归

```
线性回归：输入 → [W, b] → 输出(一个数字)

Softmax：输入 → [W, b] → 10个分数
                       → Softmax → 10个概率(和为1)
                       → argmax → 预测类别
```

关键区别：输出不是一个数字，而是每个类别都输出一个分数。有多少个类别，就有多少个输出。

---

## 代码框 1：Softmax 函数手算

模型直接输出的分数（logit）有问题：可能大于 1，可能是负数，总和不等于 1。

```
猫的分数 = 4.0   ← 大于1
狗的分数 = 1.0
鸟的分数 = -2.0  ← 负数
```

Softmax 公式：

```
                 exp(o_j)
Softmax(o_j) = ──────────────
                Σ exp(o_k)
```

三步：取指数 exp → 求和 → 除以总和。

手算：

```
exp(4.0) = 54.598
exp(1.0) = 2.718
exp(-2.0) = 0.135
总和 = 57.451

猫 = 54.598 / 57.451 = 95.0%
狗 = 2.718  / 57.451 =  4.7%
鸟 = 0.135  / 57.451 =  0.2%
总和 ≈ 1.0 ✅
```

---

## 代码框 2：Softmax 函数实现

```python
def softmax(X):
    X_exp = torch.exp(X)                     # 每个元素取指数
    partition = X_exp.sum(1, keepdim=True)    # 每行求和
    return X_exp / partition                  # 除以总和（广播）
```

`dim=1` 是按行求和，每个样本分开算自己的概率。

---

## 代码框 3：交叉熵损失函数

不用平方损失了。分类问题要关心"正确类的概率有多高"。

```
loss = -log(正确类的概率)
```

不同概率对应不同损失：

| 正确类概率 | 损失 -log(p) | 评价 |
|-----------|-------------|------|
| 0.99 | 0.010 | 几乎完美 |
| 0.50 | 0.693 | 一半一半 |
| 0.10 | 2.303 | 很差 |
| 0.01 | 4.605 | 烂到极点 |

概率越高 → 损失越小。

```python
def cross_entropy(y_hat, y):
    return -torch.log(y_hat[range(len(y_hat)), y])
```

`y_hat[range(len(y_hat)), y]` 取每个样本"正确类的概率"。

---

## 代码框 4：Fashion-MNIST 数据集

28×28 灰度图片，10 个类别，训练集 60000 张，测试集 10000 张。

```
标签 0：T恤      标签 5：凉鞋
标签 1：裤子      标签 6：衬衫
标签 2：套头衫    标签 7：运动鞋
标签 3：连衣裙    标签 8：包
标签 4：外套      标签 9：短靴
```

```python
batch_size = 256
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)
```

---

## 代码框 5：初始化参数

```python
num_inputs = 784   # 28×28 = 784 个像素
num_outputs = 10   # 10 个类别

W = torch.normal(0, 0.01, size=(num_inputs, num_outputs), requires_grad=True)
b = torch.zeros(num_outputs, requires_grad=True)
```

参数总量：784×10 + 10 = 7850 个。

---

## 代码框 6：定义模型

```python
def net(X):
    return softmax(torch.matmul(X.reshape((-1, W.shape[0])), W) + b)
```

展平 (256,1,28,28) → (256,784)，矩阵乘法 (256,784)×(784,10) = (256,10)，加偏置，Softmax。

---

## 代码框 7：计算精度

```python
def accuracy(y_hat, y):
    if len(y_hat.shape) > 1 and y_hat.shape[1] > 1:
        y_hat = y_hat.argmax(axis=1)       # 取每行最大值的下标
    cmp = y_hat.type(y.dtype) == y         # 比较预测和真实
    return float(cmp.type(y.dtype).sum())  # 数有几个对的
```

---

## 代码框 8：评估函数

```python
class Accumulator:
    def __init__(self, n):
        self.data = [0.0] * n
    def add(self, *args):
        self.data = [a + float(b) for a, b in zip(self.data, args)]
    def reset(self):
        self.data = [0.0] * len(self.data)
    def __getitem__(self, idx):
        return self.data[idx]

def evaluate_accuracy(net, data_iter):
    if isinstance(net, torch.nn.Module):
        net.eval()
    metric = Accumulator(2)
    with torch.no_grad():
        for X, y in data_iter:
            metric.add(accuracy(net(X), y), y.numel())
    return metric[0] / metric[1]
```

---

## 代码框 9：训练一轮

```python
def train_epoch_ch3(net, train_iter, loss, updater):
    if isinstance(net, torch.nn.Module):
        net.train()
    metric = Accumulator(3)
    for X, y in train_iter:
        y_hat = net(X)          # 前向传播
        l = loss(y_hat, y)      # 算损失
        l.sum().backward()      # 反向传播
        updater(X.shape[0])     # 更新参数
        metric.add(float(l.sum()), accuracy(y_hat, y), y.numel())
    return metric[0] / metric[2], metric[1] / metric[2]
```

核心四步：预测 → 算损失 → backward → 更新。

---

## 代码框 10：正式训练

```python
lr = 0.1
num_epochs = 10

def updater(batch_size):
    return d2l.sgd([W, b], lr, batch_size)

train_ch3(net, train_iter, test_iter, cross_entropy, num_epochs, updater)
```

运行结果：训练损失 0.358，训练精度 87%，测试精度 85%。100 张没见过的图片能猜对 85 张。

---

## 代码框 11：PyTorch 简洁实现

```python
from torch import nn

net = nn.Sequential(nn.Flatten(), nn.Linear(784, 10))

def init_weights(m):
    if type(m) == nn.Linear:
        nn.init.normal_(m.weight, std=0.01)
net.apply(init_weights)

loss = nn.CrossEntropyLoss(reduction='none')
trainer = torch.optim.SGD(net.parameters(), lr=0.1)

num_epochs = 10
train_ch3(net, train_iter, test_iter, loss, num_epochs, trainer)
```

`nn.CrossEntropyLoss` 内部把 Softmax 和交叉熵合并处理，用数学技巧避免了数值溢出。不用手动写 Softmax 和交叉熵了。

---

## 3.2 vs 4.1 对比

| 组件 | 3.2 线性回归 | 4.1 Softmax |
|------|-------------|------------|
| 输出 | 1 个数字 | 10 个概率 |
| 模型 | X @ w + b | softmax(X @ W + b) |
| 损失 | (pred-y)² | -log(p_correct) |
| 数据 | 合成数据 | Fashion-MNIST |
| 代码量 | ~29 行 | ~60 行 |

训练循环完全一样：预测 → 算损失 → backward → 更新。只是输出从 1 个数变成 10 个概率。
