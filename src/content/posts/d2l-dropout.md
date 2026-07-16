---
title: "《动手学深度学习》4.6 — 暂退法（Dropout）"
date: "2026-07-16"
tags: ["Deep Learning", "d2l", "正则化"]
excerpt: "d2l 4.6 节详解暂退法：训练时随机丢弃神经元防止过拟合，核心公式、代码实现、与权重衰减的对比。"
series: "d2l"
seriesOrder: 6
---

# 暂退法（Dropout）

## 是什么

暂退法 = 丢弃法 = Dropout，同一个东西，三种叫法。

**训练时，随机把一些神经元"关掉"（输出设为0），防止过拟合。**

## 为什么要用

深度网络太灵活，容易死记硬背训练集（过拟合）。暂退法强迫每个神经元都学到有用的特征，不能只靠某几个"大神"神经元。

## 三种理解角度

| 角度 | 说法 |
|------|------|
| 理论 | 往层与层之间的激活值注入噪音 |
| 操作 | 随机丢弃一些神经元（输出变0） |
| 效果 | 每次训练只用一个子网络 |

三种说法是同一件事。

## 核心公式

$$h' = \begin{cases} 0 & \text{概率 } p \\ \frac{h}{1-p} & \text{概率 } 1-p \end{cases}$$

- 以概率 $p$ 把值变成0（丢弃）
- 以概率 $1-p$ 把值除以 $1-p$（补偿，保证期望不变）
- 期望值 $E[h'] = h$，不偏不倚

## 关键要点

| 要点 | 说明 |
|------|------|
| 只在训练时用 | 测试/预测时全部神经元都参与，不丢弃 |
| 靠近输入层丢少一点 | 第一层设较小的 $p$，后面层可以设大一些 |
| 除以 $(1-p)$ 补偿 | 保证训练和测试的量级一致 |

## 代码实现

### 暂退层函数

```python
def dropout_layer(X, dropout):
    assert 0 <= dropout <= 1
    if dropout == 1:
        return torch.zeros_like(X)
    if dropout == 0:
        return X
    # 生成0/1掩码，大于p的保留，小于p的丢弃
    mask = (torch.rand(X.shape) > dropout).float()
    # 保留的部分除以(1-p)做补偿
    return mask * X / (1.0 - dropout)
```

### 模型中使用

```python
dropout1, dropout2 = 0.2, 0.5  # 第一层丢20%，第二层丢50%

class Net(nn.Module):
    def __init__(self, ...):
        ...
    def forward(self, X):
        H1 = self.relu(self.lin1(X.reshape((-1, self.num_inputs))))
        if self.training == True:    # 训练时才用
            H1 = dropout_layer(H1, dropout1)
        H2 = self.relu(self.lin2(H1))
        if self.training == True:    # 训练时才用
            H2 = dropout_layer(H2, dropout2)
        out = self.lin3(H2)
        return out
```

### 训练参数

```python
num_epochs, lr, batch_size = 10, 0.5, 256
loss = nn.CrossEntropyLoss(reduction='none')
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)
trainer = torch.optim.SGD(net.parameters(), lr=lr)
d2l.train_ch3(net, train_iter, test_iter, loss, num_epochs, trainer)
```

| 参数 | 值 | 含义 |
|------|-----|------|
| num_epochs | 10 | 数据集看10遍 |
| lr | 0.5 | 学习率 |
| batch_size | 256 | 每次取256个样本 |

## 暂退法 vs 权重衰减

| 方法 | 在哪里加噪音 | 怎么加 |
|------|-------------|--------|
| 权重衰减 | 权重参数 | 让权重变小（L2惩罚） |
| 暂退法 | 层与层之间的激活值 | 随机把激活值变0 |

## 比喻

- **子网络角度**：训练时派1000个不同的"残缺版小队"去打仗，测试时把所有人同时派出去，综合所有小队经验
- **传话角度**：在传话过程中随机捂住几个人的嘴，强迫每个人都要学会独立解题
