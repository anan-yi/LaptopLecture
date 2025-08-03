import gulp from "gulp";
import fs from "fs";
import { generateColorGradient } from "./gulphelper.js";
import { exec } from "child_process";
import { mkdirp } from 'mkdirp'

const generateLaptopRecommendationPages = (sourcePath, json) => {
  let markdown = "";

  const prices = json.data.map(item => item.price);

  prices.sort((a, b) => a - b);
  const minPrice = prices[0];

  const priceRanges = [];

  const currentPriceRange = [Math.floor(minPrice / 500) * 500, Math.ceil(minPrice / 500) * 500];
  let productCountinCurrentPriceRange = 0;

  prices.forEach(price => {
    while (price >= currentPriceRange[1] && (currentPriceRange[1] - currentPriceRange[0] < 2000)) {
      if (productCountinCurrentPriceRange >= 3) {
        break;
      }
      currentPriceRange[1] += 500;
    }
    if (price >= currentPriceRange[0] && price < currentPriceRange[1]) {
      productCountinCurrentPriceRange++;
    } else {
      if (productCountinCurrentPriceRange !== 0)
        priceRanges.push({
          startPrice: currentPriceRange[0],
          endPrice: currentPriceRange[1],
          count: productCountinCurrentPriceRange
        });
      currentPriceRange[0] = Math.floor(price / 500) * 500
      currentPriceRange[1] = Math.ceil(price / 500) * 500
      productCountinCurrentPriceRange = 1;
    }
  });

  priceRanges.push({
    startPrice: currentPriceRange[0],
    endPrice: currentPriceRange[1],
    count: productCountinCurrentPriceRange
  });

  // Calculate the color gradient
  const startColor = "#0ebeff"; // Green
  const endColor = "#ff42b3"; // Red

  const colorGradient = generateColorGradient(startColor, endColor, priceRanges.length);

  let curRangeIndex = 0;

  markdown += `---
# This file is generated from ${sourcePath}, please don't edit this file
layout: center
---
  
### [${json.meta.title}]{.text-9xl}\n\n`;

  markdown += `---
layout: center
background: '${colorGradient[curRangeIndex]}'
---
  
##### [${priceRanges[curRangeIndex].startPrice / 1000}-${priceRanges[curRangeIndex].endPrice / 1000}K]{.text-9xl .text-slate-100}\n`;

  json.data.forEach(item => {
    if (item.price > priceRanges[curRangeIndex].endPrice) {
      curRangeIndex++;
      markdown += `\n---
layout: center
background: '${colorGradient[curRangeIndex]}'
---

##### [${priceRanges[curRangeIndex].startPrice / 1000}${(curRangeIndex === priceRanges.length - 1) ? 'K+' : ('-' + priceRanges[curRangeIndex].endPrice / 1000 + 'K')}]{.text-9xl .text-slate-100}
`;
    }

    markdown += `\n---
layout: cols
---

<style>
.cols-container {
  --uno: "gap-4";
}
.good {
  --uno: "text-green-700";
}
.very-good {
  --uno: "text-green-700 font-bold";
}
.bad {
  --uno: "text-red-700";
}
.very-bad {
  --uno: "text-red-700 font-bold";
}
.attention {
  --uno: "text-yellow-700";
}
.price {
  --uno: "text-red-500 text-4xl";
}

.title {
  --uno: "text-3xl leading-8 font-bold";
}
.subtitle {
  --uno: "text-2xl leading-7 font-bold !my-1";
}
</style>
\n\n`;
    markdown += `::header::\n`;
    markdown += `##### [${item.brand} ${item.model}]{.title}\n`;

    markdown += `\n::0::\n`;
    markdown += `屏幕尺寸: ${item.screenSize}寸\n`;
    markdown += `厚度: ${item.thickness}厘米\n`;
    markdown += item.weight ? `重量: ${item.weight}千克\n` : "";
    if (item.advantages.length > 0) {
      markdown += `\n<p class="subtitle">优点</p>\n\n`;
      item.advantages.forEach(advantage => {
        markdown += `${advantage}; `;
      });
      markdown += `\n`;
    }

    if (item.disadvantages.length > 0) {
      markdown += `\n<p class="subtitle">缺点</p>\n\n`;
      item.disadvantages.forEach(disadvantage => {
        markdown += `${disadvantage}; `;
      });
      markdown += `\n`;
    }

    markdown += `\n<p class="subtitle">显示</p>\n\n`;
    markdown += `- 分辨率: ${item.display.resolution}\n`;
    markdown += `- 刷新率: ${item.display.refreshRate}Hz\n`;
    markdown += `- 色域覆盖: ${item.display.coverage}\n`;
    markdown += `- 亮度: ${item.display.brightness}\n`;

    markdown += `\n::1::\n`;
    markdown += `\n<p class="subtitle">配置</p>\n\n`;
    markdown += `- 处理器: ${item.cpu}\n`;
    markdown += `- 显卡: ${item.gpu}\n`;
    markdown += `- 内存: ${item.memory}\n`;
    markdown += `- 存储类型: ${item.storage.type}\n`;
    markdown += `- 存储容量: ${item.storage.capacity}\n`;
    markdown += `- 接口: ${item.storage.interface}\n`;

    markdown += `\n参考价格: [￥${item.price}]{.price}\n`;

    markdown += `\n[产品链接](${item.url})\n`;

    markdown += `\n::2::\n`;
    markdown += `<ImageWithHint src="${item.image}" alt="${item.brand} ${item.model}" class="w-full h-fit"/>\n`;
  });

  return markdown;
};

const laptopRecommendationMap = {
  "./pages/hardware/recommendation/laptop/igpu.json": "./generatedPages/hardware/recommendation/laptop/igpu.md",
  "./pages/hardware/recommendation/laptop/gaming.json": "./generatedPages/hardware/recommendation/laptop/gaming.md",
}

gulp.task("generate-laptop-recommendation-pages", () => {
  return new Promise((resolve, reject) => {
    Object.keys(laptopRecommendationMap).forEach(jsonFilePath => {
      const markdownFilePath = laptopRecommendationMap[jsonFilePath];
      fs.readFile(jsonFilePath, "utf-8", (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        const jsonData = JSON.parse(data);
        const markdownContent = generateLaptopRecommendationPages(jsonFilePath, jsonData);

        mkdirp.sync(markdownFilePath.substring(0, markdownFilePath.lastIndexOf("/")));
        fs.writeFile(markdownFilePath, markdownContent, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  });
});

gulp.task("slidev-build", (cb) => {
  exec("slidev build", (err, stdout, stderr) => {
    if (err) {
      console.error(`执行slidev build时出错: ${err}`);
      cb(err);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    cb();
  });
});

gulp.task("slidev-dev", (cb) => {
  exec("slidev --open", (err, stdout, stderr) => {
    if (err) {
      console.error(`执行slidev --open时出错: ${err}`);
      cb(err);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    cb();
  });
});

gulp.task("slidev-export", (cb) => {
  exec("slidev export --range 1-20 --timeout 60000", (err1) => {
    if (err1) return cb(err1);
    exec("slidev export --range 21-40 --timeout 60000", (err2) => {
      cb(err2);
    });
  });
});


gulp.task("pre", gulp.series("generate-laptop-recommendation-pages"));
gulp.task("build", gulp.series("pre", "slidev-build"));
gulp.task("dev", gulp.series("pre", "slidev-dev"));
gulp.task("export", gulp.series("pre", "slidev-export"));
