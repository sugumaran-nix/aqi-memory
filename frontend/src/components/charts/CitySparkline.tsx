"use client";
import { useCityHistory } from "@/lib/api";
import { format, subDays } from "date-fns";
import Sparkline from "@/components/ui/Sparkline";

interface CitySparklineProps {
  city: string;
  width?: number;
  height?: number;
}

export default function CitySparkline({ city, width = 120, height = 32 }: CitySparklineProps) {
  const { data, error, isLoading } = useCityHistory(city, {
    start_date: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    pollutant: "aqi",
  });

  if (isLoading) {
    return (
      <div className="skeleton rounded" style={{ width, height }} />
    );
  }

  if (error || !data?.length) {
    return <div style={{ width, height }} />;
  }

  const values = data.map((d) => d.value);
  return <Sparkline data={values} width={width} height={height} />;
}
