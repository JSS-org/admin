<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
const props = defineProps<{
  trend?: { date: string; netAmount: string; entries: number }[];
  segments?: { name: string; value: number }[];
}>();
const chart = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chart);
function render() {
  if (props.trend)
    renderEcharts({
      color: ['#1677ff', '#14b8a6'],
      tooltip: { trigger: 'axis', renderMode: 'richText' },
      legend: { bottom: 0 },
      grid: { left: 12, right: 16, top: 36, bottom: 48, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: props.trend.map((item) => item.date.slice(5)) },
      yAxis: [
        { type: 'value', name: '净实收（元）' },
        { type: 'value', name: '到店人次', minInterval: 1 },
      ],
      series: [
        {
          name: '净实收',
          type: 'line',
          data: props.trend.map((item) => Number(item.netAmount)),
          areaStyle: { opacity: 0.08 },
          symbolSize: 6,
        },
        { name: '到店人次', type: 'line', yAxisIndex: 1, data: props.trend.map((item) => item.entries), symbolSize: 6 },
      ],
    });
  else
    renderEcharts({
      color: ['#1677ff', '#14b8a6', '#94a3b8'],
      tooltip: { trigger: 'item', renderMode: 'richText' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['48%', '70%'],
          center: ['50%', '43%'],
          label: { show: false },
          data: props.segments ?? [],
          emptyCircleStyle: { color: '#e2e8f0' },
          stillShowZeroSum: false,
        },
      ],
    });
}
onMounted(render);
watch(() => [props.trend, props.segments], render, { deep: true });
</script>
<template>
  <EchartsUI ref="chart" class="h-[300px]" :aria-label="trend ? '净实收与到店趋势图' : '会员构成图'" />
</template>
