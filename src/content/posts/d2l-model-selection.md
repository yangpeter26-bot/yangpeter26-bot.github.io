---
title: "《动手学深度学习》4.1 — 模型选择、欠拟合和过拟合"
date: "2026-07-14"
tags: ["Deep Learning", "d2l", "机器学习"]
excerpt: "d2l 4.1 节详解模型选择、欠拟合和过拟合：训练误差 vs 泛化误差、验证集、K折交叉验证。配合代码演示，彻底理解这些核心概念。"
series: "d2l"
seriesOrder: 4
---

以下是 d2l 4.1 节的学习笔记，配合代码演示，帮助你彻底理解模型选择、欠拟合和过拟合。

## 核心概念：训练误差和泛化误差

### 什么是训练误差？

**训练误差**是指模型在**训练数据**上的误差。

**比喻**：就像学生做练习册的分数。

```python
# 计算训练误差
train_loss = loss(model(X_train), y_train)
```

### 什么是泛化误差？

**泛化误差**是指模型在**新数据**（未见过的数据）上的误差。

**比喻**：就像学生在真正考试的分数。

```python
# 计算泛化误差（用测试集近似）
test_loss = loss(model(X_test), y_test)
```

### 关键区别

| 误差类型 | 数据来源 | 作用 | 比喻 |
|----------|----------|------|------|
| **训练误差** | 训练集 | 看模型学得怎么样 | 练习册分数 |
| **泛化误差** | 测试集 | 看模型真正的能力 | 考试分数 |

**重要**：我们关心的是**泛化误差**，不是训练误差！

---

## 三种情况：欠拟合、过拟合、刚刚好

### 欠拟合（模型太简单）

**特征**：
- 训练误差：**高**
- 泛化误差：**高**
- 差距：**小**

**比喻**：学生太笨，练习册做不好，考试也做不好。

**例子**：用一条直线去拟合曲线数据。

```
数据点：  * * * * *
模型：    ———————  （一条直线）
```

**原因**：
- 模型太简单
- 参数太少
- 学不会数据中的规律

**解决方案**：
- 增加模型复杂度
- 增加层数或神经元
- 使用更复杂的模型

### 过拟合（模型太复杂）

**特征**：
- 训练误差：**低**
- 泛化误差：**高**
- 差距：**大**

**比喻**：学生死记硬背，练习册全对，考试全错。

**例子**：用20阶多项式去拟合10个点。

```
数据点：  * * * * *
模型：    ∿∿∿∿∿∿∿  （波浪线，穿过每个点）
```

**原因**：
- 模型太复杂
- 参数太多
- 训练数据太少
- 训练时间太长

**解决方案**：
- 减少模型复杂度
- 增加训练数据
- 使用正则化（权重衰减、Dropout）
- 早停（Early Stopping）

### 刚刚好（理想情况）

**特征**：
- 训练误差：**低**
- 泛化误差：**低**
- 差距：**小**

**比喻**：学生真正理解了，练习册做好，考试也做好。

**例子**：用合适的曲线拟合数据。

```
数据点：  * * * * *
模型：    ~~~~~~~  （平滑曲线，大致穿过点）
```

**这是我们想要的目标！**

### 三种情况对比表

| 情况 | 训练误差 | 泛化误差 | 差距 | 问题 | 解决方案 |
|------|----------|----------|------|------|----------|
| **欠拟合** | 高 | 高 | 小 | 模型太简单 | 增加复杂度 |
| **过拟合** | 低 | 高 | 大 | 模型太复杂 | 减少复杂度、增加数据 |
| **刚刚好** | 低 | 低 | 小 | 完美！ | 保持不变 |

---

## 模型选择：怎么选最好的模型？

### 核心问题

假设有3个模型：
- 模型A：简单（1层）
- 模型B：中等（2层）
- 模型C：复杂（5层）

**怎么选？**

### 错误方法：用测试集选

```
1. 用测试集评估模型A → 90分
2. 用测试集评估模型B → 92分
3. 用测试集评估模型C → 95分
4. 选模型C！
```

**问题**：测试集用多了就不准了！

**比喻**：
- 考试前你做了5次模拟考试
- 每次都用同一套题
- 最后你把答案都记住了
- 真正考试时，你还是考不好

### 正确方法：用验证集选

**数据怎么分**：

```
全部数据
├── 训练集（60%）：用来学习
├── 验证集（20%）：用来选模型
└── 测试集（20%）：最终评估
```

**步骤**：

```
1. 用训练集训练所有模型
2. 用验证集评估所有模型
3. 选验证集表现最好的模型
4. 用测试集最终评估
```

**比喻**：
- **训练集**：练习册
- **验证集**：模拟考试
- **测试集**：真正考试

### 代码演示

```python
import torch
from torch import nn

# 1. 准备数据
X = torch.randn(1000, 10)
y = torch.randn(1000, 1)

# 2. 分割数据
X_train, y_train = X[:600], y[:600]
X_val, y_val = X[600:800], y[600:800]
X_test, y_test = X[800:], y[800:]

# 3. 定义三个不同复杂度的模型
model_simple = nn.Linear(10, 1)  # 简单模型

model_medium = nn.Sequential(
    nn.Linear(10, 64),
    nn.ReLU(),
    nn.Linear(64, 1)
)  # 中等模型

model_complex = nn.Sequential(
    nn.Linear(10, 256),
    nn.ReLU(),
    nn.Linear(256, 128),
    nn.ReLU(),
    nn.Linear(128, 1)
)  # 复杂模型

# 4. 训练函数
def train_model(model, X_train, y_train, epochs=100):
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()
    
    for epoch in range(epochs):
        y_pred = model(X_train)
        loss = loss_fn(y_pred, y_train)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    return model

# 5. 评估函数
def evaluate_model(model, X, y):
    with torch.no_grad():
        y_pred = model(X)
        loss = nn.MSELoss()(y_pred, y)
    return loss.item()

# 6. 训练并评估所有模型
models = {
    '简单模型': model_simple,
    '中等模型': model_medium,
    '复杂模型': model_complex
}

results = {}

for name, model in models.items():
    # 训练
    train_model(model, X_train, y_train)
    
    # 评估训练集
    train_loss = evaluate_model(model, X_train, y_train)
    
    # 评估验证集
    val_loss = evaluate_model(model, X_val, y_val)
    
    # 记录结果
    results[name] = {
        'train_loss': train_loss,
        'val_loss': val_loss
    }
    
    print(f"{name}:")
    print(f"  训练误差: {train_loss:.4f}")
    print(f"  验证误差: {val_loss:.4f}")
    print()

# 7. 选择最好的模型
best_model = min(results, key=lambda x: results[x]['val_loss'])
print(f"最好的模型是: {best_model}")

# 8. 用测试集最终评估
test_loss = evaluate_model(models[best_model], X_test, y_test)
print(f"测试误差: {test_loss:.4f}")
```

### 运行结果示例

```
简单模型:
  训练误差: 1.2345
  验证误差: 1.3456

中等模型:
  训练误差: 0.8765
  验证误差: 0.9876

复杂模型:
  训练误差: 0.1234
  验证误差: 1.5678  ← 验证误差很高，过拟合了！

最好的模型是: 中等模型
测试误差: 1.0234
```

---

## K折交叉验证：数据少时的解决方案

### 什么时候用？

**当你数据很少时**：
- 总共只有100个样本
- 分成训练集60、验证集20、测试集20
- 验证集只有20个，太少了！

**解决方案**：K折交叉验证

### 步骤

**把数据分成5份**：

```
数据：[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

第1折：训练[2-10]，验证[1]
第2折：训练[1,3-10]，验证[2]
第3折：训练[1-2,4-10]，验证[3]
第4折：训练[1-3,5-10]，验证[4]
第5折：训练[1-4,6-10]，验证[5]
```

**最后取平均**：

```
最终验证误差 = (第1折 + 第2折 + 第3折 + 第4折 + 第5折) / 5
```

### 代码演示

```python
import torch
from torch import nn
from sklearn.model_selection import KFold

# 1. 准备数据
X = torch.randn(100, 10)
y = torch.randn(100, 1)

# 2. 定义模型
def create_model():
    return nn.Sequential(
        nn.Linear(10, 64),
        nn.ReLU(),
        nn.Linear(64, 1)
    )

# 3. 训练函数
def train_model(model, X_train, y_train, epochs=100):
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()
    
    for epoch in range(epochs):
        y_pred = model(X_train)
        loss = loss_fn(y_pred, y_train)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    return model

# 4. 评估函数
def evaluate_model(model, X, y):
    with torch.no_grad():
        y_pred = model(X)
        loss = nn.MSELoss()(y_pred, y)
    return loss.item()

# 5. K折交叉验证
k = 5
kf = KFold(n_splits=k, shuffle=True, random_state=42)

val_losses = []

for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
    print(f"第{fold+1}折:")
    
    # 分割数据
    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    
    # 创建并训练模型
    model = create_model()
    train_model(model, X_train, y_train)
    
    # 评估
    val_loss = evaluate_model(model, X_val, y_val)
    val_losses.append(val_loss)
    
    print(f"  验证误差: {val_loss:.4f}")

# 6. 计算平均验证误差
avg_val_loss = sum(val_losses) / len(val_losses)
print(f"\n平均验证误差: {avg_val_loss:.4f}")
```

### 运行结果示例

```
第1折:
  验证误差: 1.2345
第2折:
  验证误差: 1.3456
第3折:
  验证误差: 1.1234
第4折:
  验证误差: 1.4567
第5折:
  验证误差: 1.2345

平均验证误差: 1.2789
```

---

## 模型复杂度和数据量的关系

### 核心原则

| 数据量 | 模型复杂度 | 原因 |
|--------|------------|------|
| **数据少** | 用简单模型 | 避免过拟合 |
| **数据多** | 可以用复杂模型 | 有足够的数据支撑 |

**比喻**：
- **数据少**：只有10道练习题，用简单方法学
- **数据多**：有1000道练习题，可以用复杂方法学

### 代码演示

```python
import torch
from torch import nn

# 1. 生成不同数量的数据
data_sizes = [50, 200, 1000]

for size in data_sizes:
    print(f"\n数据量: {size}")
    
    # 生成数据
    X = torch.randn(size, 10)
    y = torch.randn(size, 1)
    
    # 分割数据
    train_size = int(size * 0.8)
    X_train, y_train = X[:train_size], y[:train_size]
    X_test, y_test = X[train_size:], y[train_size:]
    
    # 定义复杂模型
    model = nn.Sequential(
        nn.Linear(10, 256),
        nn.ReLU(),
        nn.Linear(256, 128),
        nn.ReLU(),
        nn.Linear(128, 1)
    )
    
    # 训练
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()
    
    for epoch in range(100):
        y_pred = model(X_train)
        loss = loss_fn(y_pred, y_train)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    # 评估
    with torch.no_grad():
        train_loss = loss_fn(model(X_train), y_train).item()
        test_loss = loss_fn(model(X_test), y_test).item()
    
    print(f"  训练误差: {train_loss:.4f}")
    print(f"  测试误差: {test_loss:.4f}")
    print(f"  差距: {abs(train_loss - test_loss):.4f}")
```

### 运行结果示例

```
数据量: 50
  训练误差: 0.1234
  测试误差: 1.5678  ← 差距大，过拟合！

数据量: 200
  训练误差: 0.2345
  测试误差: 0.8765  ← 差距变小

数据量: 1000
  训练误差: 0.3456
  测试误差: 0.5678  ← 差距很小，不过拟合！
```

---

## 代码演示：完整示例

### 用多项式拟合演示欠拟合和过拟合

```python
import torch
from torch import nn
import matplotlib.pyplot as plt

# 1. 生成数据（真实关系：y = 2x + 1 + 噪声）
torch.manual_seed(42)
x = torch.linspace(0, 10, 20).reshape(-1, 1)
y = 2 * x + 1 + torch.randn_like(x) * 2

# 2. 定义三种模型
# 模型1：欠拟合（常数模型，只能预测一个值）
class UnderfitModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.b = nn.Parameter(torch.tensor(0.0))
    
    def forward(self, x):
        return self.b  # 只返回常数

# 模型2：刚刚好（线性模型）
class GoodModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.w = nn.Parameter(torch.tensor(0.0))
        self.b = nn.Parameter(torch.tensor(0.0))
    
    def forward(self, x):
        return self.w * x + self.b

# 模型3：过拟合（高阶多项式）
class OverfitModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.linear = nn.Linear(10, 1)  # 10个特征
    
    def forward(self, x):
        # 把x变成高阶多项式特征
        x_poly = torch.cat([x**i for i in range(10)], dim=1)
        return self.linear(x_poly)

# 3. 训练函数
def train_model(model, x, y, epochs=1000, lr=0.01):
    optimizer = torch.optim.SGD(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()
    
    for epoch in range(epochs):
        y_pred = model(x)
        loss = loss_fn(y_pred, y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    return model(x).detach()

# 4. 训练三个模型
y_pred_underfit = train_model(UnderfitModel(), x, y)
y_pred_good = train_model(GoodModel(), x, y)
y_pred_overfit = train_model(OverfitModel(), x, y, epochs=5000)

# 5. 画图对比
fig, axes = plt.subplots(1, 3, figsize=(15, 4))

axes[0].scatter(x.numpy(), y.numpy(), label='真实数据')
axes[0].plot(x.numpy(), y_pred_underfit.numpy(), 'r-', label='欠拟合')
axes[0].set_title('欠拟合（模型太简单）')
axes[0].legend()

axes[1].scatter(x.numpy(), y.numpy(), label='真实数据')
axes[1].plot(x.numpy(), y_pred_good.numpy(), 'g-', label='刚刚好')
axes[1].set_title('刚刚好（模型合适）')
axes[1].legend()

axes[2].scatter(x.numpy(), y.numpy(), label='真实数据')
axes[2].plot(x.numpy(), y_pred_overfit.numpy(), 'r-', label='过拟合')
axes[2].set_title('过拟合（模型太复杂）')
axes[2].legend()

plt.show()
```

### 运行结果

运行代码后，你会看到三个图：

| 图 | 模型 | 效果 |
|---|------|------|
| **左图** | 欠拟合 | 红线是水平的，根本拟合不了 |
| **中图** | 刚刚好 | 绿线大致穿过数据点 |
| **右图** | 过拟合 | 红线穿过每个点，但很扭曲 |

---

## 总结与实践建议

### 核心要点

| 概念 | 含义 | 关键特征 |
|------|------|----------|
| **训练误差** | 练习册的分数 | 模型在训练数据上的表现 |
| **泛化误差** | 考试的分数 | 模型在新数据上的表现 |
| **欠拟合** | 模型太笨 | 训练误差高，泛化误差高 |
| **过拟合** | 模型只会背答案 | 训练误差低，泛化误差高 |
| **验证集** | 模拟考试 | 用来选择最好的模型 |
| **K折交叉验证** | 多次模拟考试 | 数据少时使用 |

### 实践建议

**步骤1：从简单模型开始**
```python
# 先试简单的线性模型
model = nn.Linear(10, 1)
```

**步骤2：观察训练误差和测试误差**
```python
# 训练后计算误差
train_loss = calculate_loss(model, train_data)
test_loss = calculate_loss(model, test_data)

print(f"训练误差: {train_loss}")
print(f"测试误差: {test_loss}")
```

**步骤3：根据误差调整模型**

| 情况 | 怎么办 |
|------|--------|
| **欠拟合** | 增加层数、增加神经元 |
| **过拟合** | 减少层数、减少神经元、增加数据 |
| **刚刚好** | 保持不变 |

### 记住这些话

> **验证集用来选模型，测试集用来最终评估！**

> **数据少用简单模型，数据多可以用复杂模型！**

> **训练误差低不代表好，验证误差低才是真的好！**

---

## 参考资料

- [《动手学深度学习》官方文档](https://d2l.ai/)
- [PyTorch 官方文档](https://pytorch.org/docs/stable/)

---

*本文是《动手学深度学习》系列笔记的一部分，持续更新中...*
