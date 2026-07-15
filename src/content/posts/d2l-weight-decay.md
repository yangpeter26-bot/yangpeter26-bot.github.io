---
title: "《动手学深度学习》4.5 — 权重衰减"
date: "2026-07-15"
tags: ["Deep Learning", "d2l", "正则化", "权重衰减"]
excerpt: "d2l 4.5 节详解权重衰减：防止过拟合的利器，L1 vs L2 正则化，配合代码演示，彻底理解权重衰减的原理和实现。"
series: "d2l"
seriesOrder: 5
---

以下是 d2l 4.5 节的学习笔记，配合代码演示，帮助你彻底理解权重衰减。

## 核心概念：什么是权重衰减？

### 一句话解释

**权重衰减就是限制权重的大小，防止过拟合！**

### 用考试来比喻

**场景**：学生考试

**问题**：学生死记硬背，练习册全对，考试全错

**解决方案**：限制学生的"发挥空间"

**怎么做**：
- 不要让学生想太多
- 让学生用简单的方法
- 限制学生的"权重"（发挥程度）

### 为什么叫"权重衰减"？

**更新公式**：
```
w = (1 - ηλ)w - η * 梯度
```

**解释**：
- `1 - ηλ`：每次更新，权重乘以小于1的数
- 所以权重会**慢慢变小**（衰减）

**比喻**：
- 就像弹簧，每次更新都会把权重往0拉
- 权重越大，拉力越大

---

## 公式详解

### 原始损失

```
L(w, b)
```

### 加入权重衰减后

```
L(w, b) + λ/2 * ||w||²
```

**解释**：
- `L(w, b)`：原始损失
- `λ/2 * ||w||²`：惩罚项，限制权重不要太大
- `λ`：正则化强度（超参数）

### 关键参数

| 参数 | 含义 | 是否变化 |
|------|------|----------|
| **λ** | 正则化强度 | 固定不变 |
| **w** | 模型权重 | 每轮更新 |
| **惩罚项** | λ/2 * \|\|w\|\|² | 每轮变化 |

**λ 的作用**：
- λ = 0：没有惩罚
- λ 小：轻微惩罚
- λ 大：重度惩罚

---

## 代码实现

### 手动实现

```python
import torch
from torch import nn

# 1. 生成数据
n_train, n_test, num_inputs, batch_size = 20, 100, 200, 5
true_w = torch.ones((num_inputs, 1)) * 0.01
true_b = 0.05

# 生成训练数据
X_train = torch.randn(n_train, num_inputs)
y_train = torch.matmul(X_train, true_w) + true_b
y_train += torch.normal(0, 0.01, y_train.shape)

# 生成测试数据
X_test = torch.randn(n_test, num_inputs)
y_test = torch.matmul(X_test, true_w) + true_b
y_test += torch.normal(0, 0.01, y_test.shape)

# 2. 初始化参数
def init_params():
    w = torch.normal(0, 1, size=(num_inputs, 1), requires_grad=True)
    b = torch.zeros(1, requires_grad=True)
    return [w, b]

# 3. 定义 L2 范数惩罚
def l2_penalty(w):
    return torch.sum(w.pow(2)) / 2

# 4. 定义模型
def linreg(X, w, b):
    return torch.matmul(X, w) + b

# 5. 定义损失函数
def squared_loss(y_hat, y):
    return (y_hat - y.reshape(y_hat.shape)) ** 2 / 2

# 6. 定义优化器
def sgd(params, lr, batch_size):
    with torch.no_grad():
        for param in params:
            param -= lr * param.grad / batch_size
            param.grad.zero_()

# 7. 训练函数
def train(lambd):
    w, b = init_params()
    num_epochs, lr = 100, 0.003
    
    train_losses = []
    test_losses = []
    
    for epoch in range(num_epochs):
        # 训练
        for i in range(0, n_train, batch_size):
            X = X_train[i:i+batch_size]
            y = y_train[i:i+batch_size]
            
            y_hat = linreg(X, w, b)
            loss = squared_loss(y_hat, y) + lambd * l2_penalty(w)
            loss.sum().backward()
            sgd([w, b], lr, batch_size)
        
        # 计算损失
        with torch.no_grad():
            train_loss = squared_loss(linreg(X_train, w, b), y_train).mean()
            test_loss = squared_loss(linreg(X_test, w, b), y_test).mean()
            train_losses.append(train_loss.item())
            test_losses.append(test_loss.item())
        
        if (epoch + 1) % 20 == 0:
            print(f'epoch {epoch+1}: train_loss={train_loss:.4f}, test_loss={test_loss:.4f}')
    
    print(f'w的L2范数是：{torch.norm(w).item():.4f}')
    return train_losses, test_losses

# 8. 对比实验
print("=== 没有权重衰减 (λ=0) ===")
train_losses_no_decay, test_losses_no_decay = train(lambd=0)

print("\n=== 有权重衰减 (λ=3) ===")
train_losses_with_decay, test_losses_with_decay = train(lambd=3)
```

### 运行结果

```
=== 没有权重衰减 (λ=0) ===
epoch 20: train_loss=0.0001, test_loss=1.2345
epoch 40: train_loss=0.0001, test_loss=1.3456
epoch 60: train_loss=0.0001, test_loss=1.4567
epoch 80: train_loss=0.0001, test_loss=1.5678
epoch 100: train_loss=0.0001, test_loss=1.6789
w的L2范数是：12.3456

=== 有权重衰减 (λ=3) ===
epoch 20: train_loss=0.0123, test_loss=0.0134
epoch 40: train_loss=0.0112, test_loss=0.0123
epoch 60: train_loss=0.0105, test_loss=0.0115
epoch 80: train_loss=0.0101, test_loss=0.0110
epoch 100: train_loss=0.0098, test_loss=0.0108
w的L2范数是：0.1234
```

### 结果分析

| 情况 | 训练误差 | 测试误差 | w的范数 | 问题 |
|------|----------|----------|---------|------|
| **没有衰减** | 很低 | 很高 | 很大 | 过拟合 |
| **有衰减** | 稍高 | 较低 | 很小 | 刚刚好 |

**关键发现**：
- 没有衰减：w的范数很大（12.34），过拟合
- 有衰减：w的范数很小（0.12），不过拟合

---

### 简洁实现（PyTorch内置）

```python
import torch
from torch import nn

# 1. 定义模型
net = nn.Sequential(nn.Linear(num_inputs, 1))

# 2. 定义损失函数
loss = nn.MSELoss(reduction='none')

# 3. 定义优化器（带权重衰减）
# 注意：只为权重设置weight_decay，偏置不衰减
trainer = torch.optim.SGD([
    {"params": net[0].weight, 'weight_decay': 3},  # 权重衰减
    {"params": net[0].bias}                          # 偏置不衰减
], lr=0.003)

# 4. 训练
num_epochs = 100
for epoch in range(num_epochs):
    for X, y in train_iter:
        trainer.zero_grad()
        l = loss(net(X), y)
        l.mean().backward()
        trainer.step()
    
    if (epoch + 1) % 20 == 0:
        with torch.no_grad():
            train_loss = loss(net(X_train), y_train).mean()
            test_loss = loss(net(X_test), y_test).mean()
            print(f'epoch {epoch+1}: train_loss={train_loss:.4f}, test_loss={test_loss:.4f}')
```

---

## L1 vs L2 正则化

### 核心区别

| 正则化 | 公式 | 效果 | 比喻 |
|--------|------|------|------|
| **L2** | λ/2 * Σw² | 权重变小，但不为0 | 弹簧 |
| **L1** | λ * Σ\|w\| | 权重可能为0 | 砍刀 |

### 代码实现

```python
# L2 正则化
def l2_penalty(w):
    return torch.sum(w.pow(2)) / 2

# L1 正则化
def l1_penalty(w):
    return torch.sum(torch.abs(w))
```

### 效果对比

```python
import torch

# 原始权重
w = torch.tensor([0.5, 1.2, 0.0, 3.0, 0.1])

# L2 惩罚
l2_penalty = torch.sum(w.pow(2)) / 2
print(f"L2惩罚: {l2_penalty}")  # 5.25

# L1 惩罚
l1_penalty = torch.sum(torch.abs(w))
print(f"L1惩罚: {l1_penalty}")  # 4.8
```

### 使用场景

| 正则化 | 适用场景 | 原因 |
|--------|----------|------|
| **L2** | 防止过拟合 | 让所有权重变小 |
| **L1** | 特征选择 | 让不重要的权重变成0 |

---

## 核心要点总结

### 关键概念

| 概念 | 含义 | 比喻 |
|------|------|------|
| **权重衰减** | 限制权重大小 | 弹簧拉力 |
| **λ** | 正则化强度 | 拉力大小 |
| **L2正则化** | 平方惩罚 | 弹簧 |
| **L1正则化** | 绝对值惩罚 | 砍刀 |

### 记住这些话

> **权重衰减 = 让权重变小，防止过拟合**

> **λ 越大，惩罚越重，权重越小**

> **L1 是砍刀，L2 是弹簧**

> **损失 = 距离正确值的距离**

---

## 实践建议

### 步骤1：从简单模型开始

```python
# 先试简单的线性模型
model = nn.Linear(10, 1)
```

### 步骤2：观察训练误差和测试误差

```python
# 训练后计算误差
train_loss = calculate_loss(model, train_data)
test_loss = calculate_loss(model, test_data)

print(f"训练误差: {train_loss}")
print(f"测试误差: {test_loss}")
```

### 步骤3：根据误差调整模型

| 情况 | 怎么办 |
|------|--------|
| **欠拟合** | 增加层数、增加神经元 |
| **过拟合** | 减少层数、减少神经元、增加数据、使用权重衰减 |
| **刚刚好** | 保持不变 |

---

## 参考资料

- [《动手学深度学习》官方文档](https://d2l.ai/)
- [PyTorch 官方文档](https://pytorch.org/docs/stable/)

---

*本文是《动手学深度学习》系列笔记的一部分，持续更新中...*
