# PAT_TOKEN 故障排除指南

## 问题描述

GitHub Actions 工作流无法读取 `secrets.PAT_TOKEN`，即使在仓库设置中已配置。

## 诊断步骤

### 1. 运行测试工作流

我已经创建了 `.github/workflows/test-pat-token.yml` 来测试 PAT_TOKEN 的可访问性。

运行步骤：
1. 提交并推送此文件到仓库
2. 在 GitHub 仓库页面，转到 **Actions** 标签
3. 选择 **Test PAT Token** 工作流
4. 点击 **Run workflow** > **Run workflow**
5. 查看输出结果

### 2. 验证 Secret 配置

请确认以下设置：

#### A. 检查 Secret 名称（区分大小写）
1. 进入仓库设置：`https://github.com/YOUR_USERNAME/recosite/settings/secrets/actions`
2. 确认 Secret 名称**完全一致**：`PAT_TOKEN`（不是 `pat_token` 或 `Pat_Token`）

#### B. 检查 Secret 范围
确保 PAT_TOKEN 是在正确的位置配置的：
- ✅ **Repository secrets** (推荐) - 仅此仓库可用
- ❌ **Organization secrets** - 需要额外配置才能在仓库中使用
- ❌ **Environment secrets** - 需要在工作流中指定 environment

#### C. 验证 PAT 令牌本身
确保 Personal Access Token 配置正确：

1. **令牌类型**：Fine-grained personal access token（推荐）或 Classic token
2. **必需权限**（Fine-grained token）：
   - Repository permissions:
     - Contents: Read and write ✅
     - Metadata: Read-only ✅
     - Workflows: Read and write ✅
3. **必需权限**（Classic token）：
   - `repo` (Full control of private repositories) ✅
   - `workflow` (Update GitHub Action workflows) ✅

4. **Repository access**：
   - 确保令牌有权访问 `recosite` 仓库
   - Fine-grained token 需要在 "Repository access" 中明确选择仓库

### 3. 常见问题

#### 问题 1：Secret 名称拼写错误
**症状**：工作流中 `secrets.PAT_TOKEN` 返回 null  
**解决**：删除旧 secret，重新创建，确保名称为 `PAT_TOKEN`

#### 问题 2：PAT 令牌过期
**症状**：Secret 存在但无法使用  
**解决**：
1. 在 GitHub Settings > Developer settings > Personal access tokens
2. 检查令牌是否过期
3. 如已过期，创建新令牌并更新 secret

#### 问题 3：PAT 令牌权限不足
**症状**：令牌存在但无法触发工作流  
**解决**：确保令牌具有 `workflow` 权限（Classic）或 `Workflows: Read and write`（Fine-grained）

#### 问题 4：Organization 仓库的额外限制
**症状**：个人仓库可用，但 Organization 仓库不可用  
**解决**：
1. Organization Settings > Actions > General
2. 确保 "Allow GitHub Actions to create and approve pull requests" 已启用

## 验证修复

### 方法 1：使用测试工作流
运行 `test-pat-token.yml`，查看输出：
```
✅ PAT_TOKEN is set (length: 40)
✅ PAT_TOKEN can access repository
```

### 方法 2：手动触发 Semantic Release
1. 提交一个 `feat:` 或 `fix:` 类型的 commit
2. 推送到 main 分支
3. 检查 Semantic Release 工作流是否成功创建 tag
4. 检查 Build and Publish 工作流是否自动触发

## 当前解决方案

如果 PAT_TOKEN 问题无法解决，当前配置使用 `GITHUB_TOKEN` 作为临时方案：

**优点**：
- ✅ Semantic Release 可以正常工作
- ✅ 创建 GitHub Release
- ✅ 生成 CHANGELOG.md

**限制**：
- ❌ 无法自动触发 Build and Publish 工作流
- ⚠️ 需要手动触发 Build and Publish

**手动触发步骤**：
1. 等待 Semantic Release 完成
2. 转到 Actions > Build and Publish
3. 点击 "Run workflow"
4. 选择创建的 tag（例如 v1.0.1）
5. 点击 "Run workflow"

## 推荐的完全自动化方案

一旦 PAT_TOKEN 配置成功，更新 `.github/workflows/semantic-release.yml`：

```yaml
- name: Run semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.PAT_TOKEN }}  # 使用 PAT
    GH_TOKEN: ${{ secrets.PAT_TOKEN }}       # 使用 PAT
    # ... 其他环境变量
```

这样，semantic-release 创建的 tag 将触发 Build and Publish 工作流。

## 需要帮助？

如果以上步骤无法解决问题，请提供：
1. `test-pat-token.yml` 工作流的完整输出
2. Secret 配置截图（隐藏实际令牌值）
3. PAT 令牌的权限配置截图
