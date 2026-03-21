import { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, TrendingUp } from 'lucide-react';

interface KLineData {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
}

interface KLineChartProps {
  symbol: string;
  market: string;
}

export default function KLineChart({ symbol, market }: KLineChartProps) {
  const [data, setData] = useState<KLineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState('1d');

  const intervals = [
    { label: '1分', value: '1m' },
    { label: '5分', value: '5m' },
    { label: '15分', value: '15m' },
    { label: '30分', value: '30m' },
    { label: '60分', value: '60m' },
    { label: '日线', value: '1d' },
    { label: '周线', value: '1w' },
    { label: '月线', value: '1M' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8030/api/kline?symbol=${symbol}&market=${market}&interval=${interval}`);
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        if (!Array.isArray(result)) {
          throw new Error("无效的行情数据格式");
        }

        // Transform [date, open, close, low, high, volume] to KLineData
        const transformedData: KLineData[] = result.map((item: any) => ({
          date: item[0],
          open: item[1],
          close: item[2],
          low: item[3],
          high: item[4],
          volume: item[5],
        }));
        setData(transformedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, market, interval]);

  const calculateMA = (dayCount: number, data: KLineData[]) => {
    const result = [];
    for (let i = 0, len = data.length; i < len; i++) {
      if (i < dayCount - 1) {
        result.push('-');
        continue;
      }
      let sum = 0;
      for (let j = 0; j < dayCount; j++) {
        sum += data[i - j].close;
      }
      result.push(+(sum / dayCount).toFixed(2));
    }
    return result;
  };

  const option = useMemo(() => {
    if (data.length === 0) return {};

    const dates = data.map(item => item.date);
    const values = data.map(item => [item.open, item.close, item.low, item.high]);
    const volumes = data.map((item, index) => [
      index,
      item.volume,
      item.close > item.open ? 1 : -1,
    ]);

    const ma5 = calculateMA(5, data);
    const ma10 = calculateMA(10, data);
    const ma20 = calculateMA(20, data);

    const upColor = '#ef4444'; // Tailwind red-500
    const upBorderColor = '#ef4444';
    const downColor = '#22c55e'; // Tailwind green-500
    const downBorderColor = '#22c55e';

    return {
      animation: false,
      legend: {
        bottom: 10,
        left: 'center',
        data: ['K线', 'MA5', 'MA10', 'MA20'],
        textStyle: { color: '#64748b' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: { color: '#000' },
        position: function (pos: any, _params: any, _el: any, _elRect: any, size: any) {
          const obj: any = { top: 10 };
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
          return obj;
        }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: { backgroundColor: '#777' }
      },
      grid: [
        { left: '10%', right: '8%', height: '50%' },
        { left: '10%', right: '8%', top: '65%', height: '16%' }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax',
          axisPointer: { z: 100 }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: { show: true },
          axisLabel: {
            formatter: (value: number) => value.toFixed(2),
            textStyle: { color: '#64748b' }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 80,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '85%',
          start: 80,
          end: 100
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upBorderColor,
            borderColor0: downBorderColor
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5,
          smooth: true,
          showSymbol: false,
          lineStyle: { opacity: 0.5, color: '#3b82f6' }
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10,
          smooth: true,
          showSymbol: false,
          lineStyle: { opacity: 0.5, color: '#f59e0b' }
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20,
          smooth: true,
          showSymbol: false,
          lineStyle: { opacity: 0.5, color: '#8b5cf6' }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes.map(v => ({
            value: v[1],
            itemStyle: { color: v[2] === 1 ? upColor : downColor }
          }))
        }
      ]
    };
  }, [data]);

  if (loading) return (
    <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-slate-500 font-medium">正在拉取 K 线数据...</p>
    </div>
  );

  if (error) return (
    <div className="h-[500px] flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
      <div>
        <div className="bg-red-50 text-red-500 p-4 rounded-2xl inline-block mb-4">
          <Activity size={32} />
        </div>
        <p className="text-red-500 font-bold">图表加载失败</p>
        <p className="text-slate-400 text-sm mt-1">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
            <TrendingUp size={20} />
          </div>
          <h3 className="font-bold text-slate-800">历史行情 K 线</h3>
        </div>
        
        <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl">
          {intervals.map((int) => (
            <button
              key={int.value}
              onClick={() => setInterval(int.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                interval === int.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>
      <ReactECharts 
        option={option} 
        style={{ height: '450px', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
