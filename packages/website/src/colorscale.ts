function calculatePoint(i: number, intervalSize: any, colorRangeInfo: any) {
  const { colorStart, colorEnd, useEndAsStart } = colorRangeInfo;
  return useEndAsStart ? colorEnd - i * intervalSize : colorStart + i * intervalSize;
}

/* Must use an interpolated color scale, which has a range of [0, 1] */
export function interpolateColors(dataLength: number, colorScale: any, colorRangeInfo: any): any[] {
  const { colorStart, colorEnd } = colorRangeInfo;
  const colorRange = colorEnd - colorStart;
  const intervalSize = colorRange / dataLength;
  let i, colorPoint;
  const colorArray = [];

  for (i = 0; i < dataLength; i++) {
    colorPoint = calculatePoint(i, intervalSize, colorRangeInfo);
    colorArray.push(colorScale(colorPoint));
  }

  return colorArray;
}
