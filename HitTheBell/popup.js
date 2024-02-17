// used chatgpt to research how to interact with the youtube api and to optimize the code using cashe, local storage, and debounce timers, as well as some error checking

// sets light/dark mode
const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-bs-theme', prefersDarkMode ? 'dark' : 'light');

// wait for html to load
document.addEventListener('DOMContentLoaded', async function() {
    var API_KEY = "your-api-key-here";
    console.log(API_KEY);

    // get the input field, search results, and channel list html elements
    var searchInput = document.getElementById('search-input');
    var searchResults = document.getElementById('search-results');
    var youtuberList = document.getElementById('youtuber-list');

    var cache = {};
    var debounceTimer;

    // get channel data from browser storage if any exists and use it to update the window
    const channelDataListString = localStorage.getItem('channelDataList');
    if (channelDataListString) {
        const channelDataList = JSON.parse(channelDataListString);
        await loadYoutubers(channelDataList);
        await checkAndDisplayNotification(channelDataList);
    } else {
        console.log('No channel data found in localStorage.');
    }

    // searches youtube api for a list of channels when you type in the input field
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            const query = searchInput.value.trim();
            if (query) {
                searchChannels(query);
            } else {
                searchResults.innerHTML = '';
            }
        }, 500); // Adjust the debounce delay as needed
    });

    // searches youtube api for a list of channels and displays them
    function searchChannels(query) {
        if (cache[query]) {
            displaySearchResults(cache[query]);
        } else {
            const encodedQuery = encodeURIComponent(query);
            fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&type=channel&key=${API_KEY}`)
                .then(response => response.json())
                .then(data => {
                    cache[query] = data.items;
                    displaySearchResults(data.items);
                })
                .catch(error => {
                    console.error('Error searching channels:', error);
                });
        }
    }

    // displays list of channels with an "add" button to add one to a list
    function displaySearchResults(items) {
        searchResults.innerHTML = '';
        items.forEach(item => {
            const channelTitle = item.snippet.title;
            const channelId = item.id.channelId;
            const iconUrl = item.snippet.thumbnails.default.url;
    
            // Create the list item in html for the channel
            const channelItem = document.createElement('li');
            channelItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'borderless');
    
            // Create the iconContainer div
            const iconContainer = document.createElement('div');
            iconContainer.classList.add('me-3'); // Add margin to the right
    
            // Create the icon element
            const icon = document.createElement('img');
            icon.src = iconUrl;
            icon.alt = channelTitle + " icon";
            icon.width = 50;
            icon.classList.add('icon');
    
            // Append the icon to iconContainer
            iconContainer.appendChild(icon);
            iconContainer.classList.add('iconContainer');
    
            // Create the span element for the channel name
            const channelNameSpan = document.createElement('span');
            channelNameSpan.textContent = channelTitle;
            
            // Create the "Add" button
            const addButton = document.createElement('button');
            addButton.textContent = 'Add';
            addButton.classList.add('btn', 'btn-primary', 'btn-sm', 'btn-danger', 'invisible');
    
            // Add event listeners to the "Add" button
            addButton.addEventListener('click', async function() {
                const { lastUpload, uploadsPlaylistId } = await getUploadTime(channelId);
                addChannelToList(channelTitle, channelId, iconUrl, lastUpload, uploadsPlaylistId); // passes channel-specific variables found in this function that are needed in the next function
            });
            channelItem.addEventListener('mouseenter', function() {
                addButton.classList.remove('invisible');
            });
            channelItem.addEventListener('mouseleave', function() {
                addButton.classList.add('invisible');
            });
            
            // adds the elements to the list
            channelItem.appendChild(iconContainer);
            channelItem.appendChild(channelNameSpan);
            channelItem.appendChild(addButton);
            
            // adds the list to the searchResults element
            searchResults.appendChild(channelItem);
        });
    }

    // creates "delete" button for channel list items
    function createDeleteButton(listItem, channelId) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '❌';
        deleteButton.classList.add('btn', 'btn-sm', 'float-end', 'me-2', 'invisible');

        // adds functionality to the delete button
        deleteButton.addEventListener('click', function() { 
            listItem.remove(); // stops displaying the item in the window

            // removes channel from browser's local storage
            const channelDataListString = localStorage.getItem('channelDataList');
            if (channelDataListString) {
                const channelDataList = JSON.parse(channelDataListString);
                const updatedChannelDataList = channelDataList.filter(channelData => channelData.channelId !== channelId); // filters local storage to all channels except the one you delete
                localStorage.setItem('channelDataList', JSON.stringify(updatedChannelDataList)); // updates local storage to exclude deleted channel
            }
        });
        // make button invisible unless hovering over it
        listItem.addEventListener('mouseenter', function() { 
            deleteButton.classList.remove('invisible');
        });
        listItem.addEventListener('mouseleave', function() {
            deleteButton.classList.add('invisible');
        });
        return deleteButton;
    }

    // adds a channel to a list and stores it's info to browser local storage
    function addChannelToList(channelTitle, channelId, iconUrl, lastUpload, uploadsPlaylistId, hasNotification = false) {
        // getting info ready to be displayed
        const listItem = document.createElement('li'); // list item for html
        listItem.classList.add('list-group-item', 'borderless'); // sets html classes for list
        const link = document.createElement('a'); // hyperlink tag
        const iconContainer = document.createElement('div'); // makes container for icon and notification
        const icon = document.createElement('img');
        const notificationIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); // makes an svg image, parameters set later
        const channelUrl = `https://www.youtube.com/channel/${channelId}`;
    
        // set attributes for hyperlink
        link.href = channelUrl;
        link.textContent = channelTitle;
        link.target = "_blank"; // Open link in new tab
        link.rel = "noopener noreferrer"; // Security best practice for target="_blank"
    
        // set attributes for the icon
        icon.src = iconUrl;
        icon.alt = channelTitle + " icon";
        icon.width = 50; // Adjust icon size as needed
        icon.classList.add('icon');
    
        // set attributes for the notification SVG
        notificationIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        notificationIcon.setAttribute('width', '20');
        notificationIcon.setAttribute('height', '20');
        notificationIcon.setAttribute('viewBox', '0 0 20 20');
        notificationIcon.setAttribute('data-channel', channelId);
        notificationIcon.innerHTML = '<circle cx="10" cy="10" r="4" fill="rgb(62, 166, 255)" />';
        if (hasNotification) {
            notificationIcon.style.opacity = '1';
        }
        else {
            notificationIcon.style.opacity = '0';
        }
        notificationIcon.classList.add('notificationIcon'); // give it a class i made in css file
    
        // Append icon and notification to the iconContainer
        iconContainer.classList.add('iconContainer');
        iconContainer.appendChild(icon);
        iconContainer.appendChild(notificationIcon);
    
        // Create delete button
        const deleteButton = createDeleteButton(listItem, channelId);
    
        // removes notification when hyperlink is clicked
        link.addEventListener('click', function() {
            notificationIcon.style.opacity = '0';
            updateNotificationStatus(channelId, false);
        });
    
        // Append icon, link, and delete button to the list item
        listItem.appendChild(iconContainer);
        listItem.appendChild(link);
        listItem.appendChild(deleteButton);
    
        // Append list item to yt channel list
        youtuberList.appendChild(listItem);
    
        // updates or creates a list of channel data in browser local storage
        const channelDataList = JSON.parse(localStorage.getItem('channelDataList')) || [];
        const existingChannelIndex = channelDataList.findIndex(channel => channel.channelId === channelId);
        if (existingChannelIndex === -1) {
            // Create a new object to store channel info in
            const channelData = {
                channelTitle: channelTitle,
                channelId: channelId,
                iconUrl: iconUrl,
                lastUpload: lastUpload,
                uploadsPlaylistId: uploadsPlaylistId,
                hasNotification: hasNotification
            };
            channelDataList.push(channelData);
        }
        localStorage.setItem('channelDataList', JSON.stringify(channelDataList));
    }

    // uses local storage data to add channels to the channel list
    function loadYoutubers(channelDataList) {
        channelDataList.forEach(function(channelData) {
            addChannelToList(channelData.channelTitle, channelData.channelId, channelData.iconUrl, channelData.lastUpload, channelData.uploadsPlaylistId, channelData.hasNotification);
        });
    }

    // checks last upload time of every channel and makes a notification if there's a new video
    async function checkAndDisplayNotification(channelDataList) {
        try {
            const updatedChannelDataList = await Promise.all(channelDataList.map(async (channelData) => {
                const { channelId, uploadsPlaylistId, lastUpload } = channelData;
                const uploadData = await getUploadTime(channelId, uploadsPlaylistId);
                
                // Check if uploadData is valid
                if (uploadData) {
                    const lastUploadDateTimeObj = new Date(lastUpload);
                    const newUploadDateTimeObj = new Date(uploadData.lastUpload);
        
                    // If the new upload time is greater than the last upload time, update and trigger notification
                    if (newUploadDateTimeObj > lastUploadDateTimeObj) {
                        console.log('ChannelId:', channelId);
                        const notification = document.querySelector(`svg[data-channel="${channelId}"]`);
                        console.log('Notification Element:', notification);
                        if (notification) {
                            notification.style.opacity = '1';
                        }
        
                        // Update lastUploadDateTime only if a new upload is detected
                        return {
                            ...channelData,
                            lastUpload: newUploadDateTimeObj.toISOString(),
                            hasNotification: true
                        };
                    }
                }
                return channelData;
            }));
        
            // Save updated channelDataList to localStorage
            localStorage.setItem('channelDataList', JSON.stringify(updatedChannelDataList));
        } catch (error) {
            console.error('Error checking and displaying notifications:', error);
        }
    }

    // find the upload time of the most recent video on a channel and store it and the playlistID for the channel
    async function getUploadTime(channelId = null, uploadsPlaylistId = null) {
        try {
            // get playlistId if it wasn't stored already
            if (!uploadsPlaylistId) {
                const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`);
                const channelData = await channelResponse.json();
                uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
            }
            
            // get list of videos
            const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1&key=${API_KEY}`);
            const playlistData = await playlistResponse.json();
            
            // get the upload time of the most recent video
            if (playlistData.items && playlistData.items.length > 0) {
                return { lastUpload: playlistData.items[0].snippet.publishedAt, uploadsPlaylistId: uploadsPlaylistId };
            } else {
                return null; // No videos found in the uploads playlist
            }
        } catch (error) {
            console.error('Error fetching video data:', error);
            return null;
        }
    }

    // Function to update the notification status in local storage
    function updateNotificationStatus(channelId, status) {
        const channelDataList = JSON.parse(localStorage.getItem('channelDataList')) || [];
        const channelIndex = channelDataList.findIndex(channelData => channelData.channelId === channelId);
        if (channelIndex !== -1) {
            channelDataList[channelIndex].hasNotification = status;
            localStorage.setItem('channelDataList', JSON.stringify(channelDataList));
        }
    }
});