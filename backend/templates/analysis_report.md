# AI 财报深度透视: {{ symbol }} ({{ market }})

**AI 健康得分**: {{ score }}/100
**生成时间**: {{ generated_at }}
{% if cached_at %}**缓存于**: {{ cached_at }}{% endif %}

## 🟢 业绩亮点
{% for item in highlights %}
* {{ item }}
{% endfor %}

## 🔴 业绩压力
{% for item in lowlights %}
* {{ item }}
{% endfor %}

## 📈 指标趋势解读
{% for item in trends %}
* {{ item }}
{% endfor %}

## 🏥 财务健康度
{{ health }}

## ⚠️ 风险预警
{% for item in risks %}
* {{ item }}
{% endfor %}

## 💡 AI 结论建议
{{ conclusion }}

> 声明：投资有风险，入市需谨慎。本报告由 AI 模型生成，仅供参考，不构成投资建议。
