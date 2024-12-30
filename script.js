/****************************************************************
 * 1. 加载 LRC 文件并解析
 ****************************************************************/
async function fetchLyrics(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parseLRC(text);
  }
  
  /**
   * 解析 LRC 内容，返回格式：
   * [
   *   { start: 0.0, end: 5.0, text: "字幕1" },
   *   { start: 5.0, end: 10.0, text: "字幕2" },
   *   ...
   * ]
   */
  function parseLRC(lrcText) {
    const lines = lrcText.split("\n");
    const lrcData = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
  
      // 匹配时间戳 [mm:ss.xx]，后面是字幕内容
      const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d{1,2})?)\](.*)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const text = match[3].trim();
        const startTime = min * 60 + sec;
  
        lrcData.push({ start: startTime, text });
      }
    }
  
    // 按 startTime 排序
    lrcData.sort((a, b) => a.start - b.start);
  
    // 计算每一段的 endTime = 下一段 startTime
    for (let i = 0; i < lrcData.length; i++) {
      if (i < lrcData.length - 1) {
        lrcData[i].end = lrcData[i + 1].start;
      } else {
        // 最后一行给一个默认的 endTime，可以自行修改或在音频加载后再修正
        lrcData[i].end = lrcData[i].start + 5;
      }
    }
  
    return lrcData;
  }
  
  /****************************************************************
   * 2. 渲染字幕 + 绑定事件
   ****************************************************************/
  function renderLyrics(lyricsData, container) {
    container.innerHTML = "";
  
    for (let i = 0; i < lyricsData.length; i++) {
      const lineDiv = document.createElement("div");
      lineDiv.classList.add("lyric-line");
      lineDiv.textContent = lyricsData[i].text;
  
      // 把当前行索引存在元素的 dataset 属性里
      lineDiv.dataset.index = i;
  
      // 点击事件
      lineDiv.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        handleLyricClick(idx);
      });
  
      container.appendChild(lineDiv);
    }
  }
  
  /****************************************************************
   * 3. 播放逻辑 + 高亮切换
   ****************************************************************/
  let currentIndex = 0;            // 当前播放的字幕索引
  let lyricsData = [];             // 解析出的 LRC 数据
  const audioPlayer = document.getElementById("audioPlayer");
  const continuousModeCheckbox = document.getElementById("continuousMode");
  
  /**
   * 点击字幕时触发
   */
  function handleLyricClick(index) {
    // 如果点击的是当前正在播放的行，则播放/暂停切换
    if (index === currentIndex) {
      if (!audioPlayer.paused) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } else {
      // 切换到点击的那一行
      currentIndex = index;
      playSegment(currentIndex);
    }
  
    // 高亮当前行
    highlightLyricLine(index);
  }
  
  /**
   * 播放指定索引的字幕段
   */
  function playSegment(index) {
    if (index < 0 || index >= lyricsData.length) return;
  
    const startTime = lyricsData[index].start;
    const endTime = lyricsData[index].end;
  
    // 跳转到 startTime 并播放
    audioPlayer.pause();
    audioPlayer.currentTime = startTime;
    audioPlayer.play();
  
    // 监听播放进度，检查是否到达该段结束时间
    audioPlayer.ontimeupdate = () => {
      if (audioPlayer.currentTime >= endTime) {
        audioPlayer.pause();
        audioPlayer.ontimeupdate = null; // 清除监听，防止重复触发
  
        // 检查是否连续播放
        if (continuousModeCheckbox.checked) {
          // 连续播放：切到下一段
          currentIndex++;
          if (currentIndex < lyricsData.length) {
            playSegment(currentIndex);
            highlightLyricLine(currentIndex);
          }
        } else {
          // 不连续：重复播放当前段
          playSegment(index);
          highlightLyricLine(index);
        }
      }
    };
  }
  
  /**
   * 高亮当前字幕行
   */
  function highlightLyricLine(index) {
    const lines = document.querySelectorAll(".lyric-line");
    // 先移除所有高亮
    lines.forEach(line => line.classList.remove("active"));
    // 给当前行添加高亮
    if (lines[index]) {
      lines[index].classList.add("active");
    }
  }
  
  /****************************************************************
   * 4. 初始化：加载 LRC -> 渲染
   ****************************************************************/
  (async function init() {
    // 获取字幕容器
    const container = document.getElementById("lyricsContainer");
    
    // 加载并解析 LRC 文件
    lyricsData = await fetchLyrics("lyric.lrc");
  
    // 渲染到页面
    renderLyrics(lyricsData, container);
  
    // 如果想页面加载后自动高亮第一行，可在此调用
    // highlightLyricLine(0);
  
    // 如果想页面加载后自动播放第一行，也可调用：
    // playSegment(0);
  })();
  