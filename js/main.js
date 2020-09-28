var source = "https://spreadsheets.google.com/feeds/cells/1SHlMvmClCuTVQCE8dqdjkXZ65gHEqj-z1ucylXmY2bI/1/public/full?alt=json"

var clips = [];
var types = [];
var currentClipIndex = 0;
var loadedClipIndex = 0;
var displayColumns = [
    {key: "date", label: "Date"},
    {key: "title", label: "Title"},
    {key: "type", label: "Type"}
];
var displayDateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
var displayDateLocale = "en-CA"

var previouslySelectedIndex = -1;
var shuffleActive = false;
var shuffleOrder = [];

$(function() {
    $.getJSON( source, function( data ) {
        getClips(data.feed.entry)
        buildClipsTable();
        loadYoutubePlayer();
    });
});

function getClips(entries) {
    // Headings is a map of column headings
    const headings = [];
    let pRow = -1;
    // Loop over the spreadsheet cells
    for (entry of entries) {
        const cell = entry['gs$cell'];
        const row = parseInt(cell.row);
        const col = parseInt(cell.col);
        if(row === 1) {
            switch(cell["$t"]) {
                case "VideoID":
                    headings[col] = "videoID";
                    break;
                case "Date":
                    headings[col] = "date";
                    break;
                case "Title":
                    headings[col] = "title";
                    break;
                case "Start Time":
                    headings[col] = "start";
                    break;
                case "End Time":
                    headings[col] = "end";
                    break;
                case "Type":
                    headings[col] = "type";
                    break;
                case "Number":
                    headings[col] = "number";
                    break;
                default:
                    headings[col] = "";
                    break;
            }
        } else if (row > 1) {
            if (pRow !== row) {
                // We have a new row, add an entry and sae the last one.
                clips[row - 2] = {
                    selected: true,
                    visible: true,
                }
                pRow = row;
                shuffleOrder.push(row - 2);
            }
            const key = headings[col];
            if (key === "") {
                continue;
            }
            let value = cell["$t"];
            switch(key) {
                case "start":
                case "end":
                case "number":
                    value = parseInt(value);
                    break;

                case "date":
                    value = new Date(value);
            }
            clips[row - 2][key] = value;
        }
    }
    typesMap = {};
    clips.forEach((clip)=> {
        if(!typesMap.hasOwnProperty(clip.type)) {
            types.push(clip.type);
            typesMap[clip.type] = 1;
        }
    });
    // Get a shuffle order
    shuffleOrder = shuffle(shuffleOrder);
}
function buildClipsTable() {
    let table = document.getElementById("clipsTable");
    let data = Object.keys(clips[0]);
    updateShuffleActive();
    generateFilters();
    generateTableHead(table, data);
    generateTable(table, clips);
    updateFilteredClips();
}
function generateFilters() {
    typeFilterContainer = $("#type-filters");
    types.forEach( (type) => {
        var label = document.createElement("label");
        text = document.createTextNode(capitalizeFirstLetter(type));
        label.appendChild(text);
        var checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.id = "filter-" + type;
        checkbox.className = "filter-checkbox";
        checkbox.addEventListener ("click", function(ev) {
            updateFilteredClips()
        });
        checkbox.checked = true;
        label.appendChild(checkbox);
        typeFilterContainer.append(label);
    });
}

function generateTableHead(table, data) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    let sTh = document.createElement("th");
    let sText = document.createTextNode("Select");
    sTh.appendChild(sText);
    row.appendChild(sTh);
    for (let column of displayColumns) {
        let th = document.createElement("th");
        th.className = "column-" + column.key;
        let text = document.createTextNode(column.label);
        th.appendChild(text);
        row.appendChild(th);
    }
    let pTh = document.createElement("th");
    let pText = document.createTextNode("Play");
    pTh.appendChild(pText);
    row.appendChild(pTh);
}

function generateTable(table, data) {
    mainPlayIcon = $(".player-controls .play-icon");
    data.forEach( (clip, i) => {
        let row = table.insertRow();
        row.id = "clipRow-" + i;
        row.className = "type-" + clip.type;
        row.addEventListener ("dblclick", function(ev) {
            currentClipIndex = i;
            loadCurrentVideo(true);
        });
        let sCell = row.insertCell();
        var checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.id="video-"+i;
        checkbox.className = "clip-checkbox";
        checkbox.addEventListener ("click", function(ev) {
            handleClipCheckboxClick(ev, i)
        });
        checkbox.checked = clip.selected;
        sCell.appendChild(checkbox);
        for (let column of displayColumns) {
            let cell = row.insertCell();
            cell.className = "column-" + column.key;
            let value = clip[column.key]
            if(column.key === "type") {
                value = capitalizeFirstLetter(value);
            }
            if(column.key === "date") {
                value = value.toLocaleDateString(displayDateLocale, displayDateOptions);
            }
            let text = document.createTextNode(value);
            cell.appendChild(text);
        }
        let pCell = row.insertCell();
        var button = document.createElement("button");
        button.type = "button";

        button.innerHTML = "<span class='sr-only'>Play</span>";
        button.title = "Play";
        button.className = "control-button";
        mainPlayIcon.clone().appendTo(button);
        button.addEventListener ("click", function() {
            currentClipIndex = i;
            loadCurrentVideo(true);
        });
        pCell.appendChild(button);
    });
}

function handleClipCheckboxClick(ev, selectedIndex) {
    if (ev.shiftKey && previouslySelectedIndex >= 0) {
        // Operate on all clips between the previous and current indices
        var startI = selectedIndex;
        var endI = previouslySelectedIndex;
        if (selectedIndex > previouslySelectedIndex) {
            startI = previouslySelectedIndex;
            endI = selectedIndex;
        }
        const checked = $("#video-" + selectedIndex).prop("checked");
        for(let i = startI; i <= endI; i++) {
            $("#video-" + i).prop("checked", checked);
        }
    }
    previouslySelectedIndex = selectedIndex;
    updateSelectedClips()
}

function updateSelectedClips() {
    $(".clip-checkbox").each((i, checkbox) => {
        clips[i].selected = checkbox.checked
    });
    checkCurrentClipValid();
}
function updateFilteredClips() {
    filterMap = {};
    $(".filter-checkbox").each((i, checkbox) => {
        type = checkbox.id.substr(7);
        filterMap[type] = checkbox.checked;
    });
    var startDate = new Date($("#start-date").val());
    if (!isValidDate(startDate) ) {
        startDate = new Date(1970, 01, 01)
    }
    var endDate = new Date($("#end-date").val());
    if (!isValidDate(endDate) ) {
        endDate = new Date(2099, 12, 31)
    }

    clips.forEach((clip, i) => {
        if (clip.date < startDate || clip.date > endDate) {
            clip.visible = false;
        } else {
            clip.visible = filterMap[clip.type];
        }
        if(clip.visible) {
            $("#clipRow-" + i).removeClass("hidden");
        } else {
            $("#clipRow-" + i).addClass("hidden");
        }
    });
    checkCurrentClipValid();
}

function checkCurrentClipValid() {
    // Check if we have hidden the current video
    const clip = clips[currentClipIndex];
    if (!clip.visible || !clip.selected) {
        // If we are currently playing it should play the next one, otherwise it should just select it to play
        const foundNextVideo = selectNextVideo();
        if (foundNextVideo) {
            if (typeof(player) !== "undefined") {
                loadCurrentVideo(player.getPlayerState() === 1);
            }
        }
    }
}

function loadYoutubePlayer() {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/player_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Replace the 'ytplayer' element with an <iframe> and
// YouTube player after the API code downloads.
var player;

function onYouTubePlayerAPIReady() {
    clip = clips[currentClipIndex];
    var playerConfig = {
        height: '360',
        width: '640',
        videoId: clip.videoID,
        playerVars: {
        autoplay: 0, // Auto-play the video on load
        controls: 0, // Show pause/play buttons in player
        showinfo: 1, // Hide the video title
        modestbranding: 1, // Hide the Youtube Logo
        fs: 1, // Hide the full screen button
        cc_load_policy: 0, // Hide closed captions
        iv_load_policy: 3, // Hide the Video Annotations
        start: clip.start,
        end: clip.end,
        autohide: 0, // Hide video controls when playing
        rel: 0,
        },
        events: {
        'onStateChange': onStateChange
        }
    };
    player = new YT.Player('ytplayer', playerConfig);
    markActiveClip();
}

function onStateChange(state) {
    var _video_url = state.target.getVideoUrl();
    var _video_id = _video_url.split('v=')[1];
    var _end_play_time = player.getCurrentTime();
    clip = clips[currentClipIndex];

    if (state.data === YT.PlayerState.ENDED && _end_play_time >= clip.end) {
        nextVideo();
    }
}

function playVideo() {
    if (loadedClipIndex !== currentClipIndex) {
        loadCurrentVideo(true);
    } else {
        player.playVideo();
    }
}

function pauseVideo() {
    player.pauseVideo();
}

function previousVideo() {
    let i = currentClipIndex;
    while(i > 0) {
        i--;
        clip = clips[i];
        if(clip.selected && clip.visible) {
            currentClipIndex = i;
            break;
        }
    }
    loadCurrentVideo(true);
}

function selectNextVideo() {
    let foundClip = false;
    if (shuffleActive) {
        // Walk through the shuffle order
        let shuffleI = shuffleOrder.indexOf(currentClipIndex);
        while(shuffleI < shuffleOrder.length - 1) {
            shuffleI++;
            i = shuffleOrder[shuffleI];
            clip = clips[i];
            if(clip.selected && clip.visible) {
                currentClipIndex = i;
                foundClip = true;
                break;
            }
        }
        if (!foundClip) {
            // Look from the beginning
            shuffleI = -1;
            while(shuffleI < shuffleOrder.length - 1) {
                shuffleI++;
                i = shuffleOrder[shuffleI];
                clip = clips[i];
                if(clip.selected && clip.visible) {
                    currentClipIndex = i;
                    foundClip = true;
                    break;
                }
            }
        }
    } else {
        let i = currentClipIndex;
        while(i < clips.length - 1) {
            i++;
            clip = clips[i];
            if(clip.selected && clip.visible) {
                currentClipIndex = i;
                foundClip = true;
                break;
            }
        }
        if (!foundClip) {
            // Look from the beginning
            i = -1;
            while(i < clips.length - 1) {
                i++;
                clip = clips[i];
                if(clip.selected && clip.visible) {
                    currentClipIndex = i;
                    foundClip = true;
                    break;
                }
            }
        }
    }
    return foundClip;
}

function nextVideo() {
    const foundNextVideo = selectNextVideo();
    if (foundNextVideo) {
        loadCurrentVideo(true);
    } else {
        pauseVideo();
    }
}

function updateShuffleActive() {
    shuffleActive = $("#shuffle").prop("checked");
}

function loadCurrentVideo(playVideo) {
    clip = clips[currentClipIndex];
    if (typeof clip === 'undefined') {
        currentClipIndex = 0;
        markActiveClip();
        return;
    }

    if (playVideo) {
        player.loadVideoById({
            videoId: clip.videoID,
            startSeconds: clip.start,
            endSeconds: clip.end
        });
    } else {
        player.cueVideoById({
            videoId: clip.videoID,
            startSeconds: clip.start,
            endSeconds: clip.end
        });
    }
    loadedClipIndex = currentClipIndex;
    markActiveClip();
}

function markActiveClip() {
    $("#clipsTable tr").removeClass("active");
    $("#clipRow-" + currentClipIndex).addClass("active");
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

function shuffle(array) {
    var curIndex = array.length,
        temporaryValue, randIndex;

    // While there remain elements to shuffle...
    while (0 !== curIndex) {

        // Pick a remaining element...
        randIndex = Math.floor(Math.random() * curIndex);
        curIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[curIndex];
        array[curIndex] = array[randIndex];
        array[randIndex] = temporaryValue;
    }

    return array;
}