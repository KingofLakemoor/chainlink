"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  wins: {
    label: "wins",
    color: "hsl(var(--chart-5))",
  },
  losses: {
    label: "losses",
    color: "hsl(var(--chart-2))",
  },
  pushes: {
    label: "pushes",
    color: "hsl(var(--chart-3) / 0.3)",
  },
} satisfies ChartConfig;

interface MonthlyStatsChartProps {
  monthlyData: {
    month: string;
    wins: number;
    losses: number;
    winRate: number;
    pushes: number;
  }[];
}

export const MonthlyStatsChart: React.FC<MonthlyStatsChartProps> = ({
  monthlyData,
}) => {
  //change yyyyMM to month name
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const lastTwelveMonths = monthlyData.slice(-12).map((month) => {
    const monthName = monthNames[parseInt(month.month.slice(4, 6)) - 1];
    return { ...month, month: `${monthName} ${month.month.slice(0, 4)}` };
  });
  if (!lastTwelveMonths || lastTwelveMonths.length === 0) return null;

  return (
    <Card className="bg-background/20">
      <CardHeader className="items-center pb-4">
        <CardTitle>Monthly Wins and Losses</CardTitle>
        <CardDescription>Wins and Losses last 12 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={lastTwelveMonths}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="wins"
              type="monotone"
              stroke="var(--color-wins)"
              strokeWidth={2}
              dot={false}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground/50"
                fontSize={8}
              />
            </Line>
            <Line
              dataKey="losses"
              type="monotone"
              stroke="var(--color-losses)"
              strokeWidth={2}
              dot={false}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground/50"
                fontSize={8}
              />
            </Line>

            <Line
              dataKey="pushes"
              type="monotone"
              stroke="var(--color-pushes)"
              strokeWidth={1}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
