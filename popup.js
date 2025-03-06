document.addEventListener('DOMContentLoaded', function () {

    const paperTitleElem = document.getElementById('paper-title')
    const paperUrlElem = document.getElementById('paper-url')
    const groupSelectElem = document.getElementById('group-select')
    const saveButtonElem = document.getElementById('save-button')
    const newGroupNameElem = document.getElementById('new-group-name')
    const createGroupButtonElem = document.getElementById('create-group-button')
    const groupListElem = document.getElementById('group-list')
    const filterGroupElem = document.getElementById('filter-group')
    const papersContainerElem = document.getElementById('papers-container')

    let currentPaper = {
        title: '',
        url: '',
        date: null
    }

    /**
     * pre-loads the groups (of papers) that the user manages
     */
    function loadGroups() {
        chrome.storage.sync.get(['groups'], function (result) {
            const groups = result.groups || []

            while (groupSelectElem.options.length > 1) {
                groupSelectElem.remove(1)
            }

            while (filterGroupElem.options.length > 1) {
                filterGroupElem.remove(1)
            }

            groups.forEach(group => {
                const option = document.createElement('option')
                option.value = group.id
                option.textContent = group.name
                groupSelectElem.appendChild(option)

                const filterOption = document.createElement('option')
                filterOption.value = group.id
                filterOption.textContent = group.name
                filterGroupElem.appendChild(filterOption)
            })

            updateGroupList(groups)
        })
    }

    /**
     * update the paper groups
     */
    function updateGroupList(groups) {
        groupListElem.innerHTML = ''

        if (groups.length === 0) {
            const emptyMessage = document.createElement('div')
            emptyMessage.textContent = 'No groups created yet'
            emptyMessage.style.padding = '10px 0'
            emptyMessage.style.color = '#5f6368'
            emptyMessage.style.fontStyle = 'italic'
            groupListElem.appendChild(emptyMessage)
            return
        }

        groups.forEach(group => {
            const li = document.createElement('li')

            const groupInfo = document.createElement('span')
            groupInfo.textContent = `${group.name} (${group.count || 0})`
            li.appendChild(groupInfo)

            const deleteButton = document.createElement('button')
            deleteButton.textContent = 'Delete'
            deleteButton.className = 'danger-button'
            deleteButton.dataset.groupId = group.id
            deleteButton.addEventListener('click', function (e) {
                e.stopPropagation()
                if (confirm(`Delete group "${group.name}"? This will not delete saved papers.`)) {
                    deleteGroup(group.id)
                }
            })

            li.appendChild(deleteButton)
            groupListElem.appendChild(li)
        })
    }

    /**
     * Delete groups of papers
     */
    function deleteGroup(groupId) {
        chrome.storage.sync.get(['groups', 'papers'], function (result) {
            let groups = result.groups || []

            groups = groups.filter(group => group.id !== groupId)

            /**
             * TODO: currently, removing group but not removing papers in that groups, just changing their but keeping them in memory
             * TODO: think about putting an option to remove ALL papers associated in a group? give user that option tho 
             */
            let papers = result.papers || []
            papers = papers.map(paper => {
                if (paper.groupId === groupId) {
                    paper.groupId = null
                }
                return paper
            })

            chrome.storage.sync.set({ groups, papers }, function () {
                loadGroups()
                loadPapers()
            })
        })
    }

    /**
     * Create a new group
     */
    createGroupButtonElem.addEventListener('click', function () {
        const groupName = newGroupNameElem.value.trim()

        if (!groupName) {
            alert('Please enter a group name')
            return
        }

        chrome.storage.sync.get(['groups'], function (result) {
            const groups = result.groups || []

            if (groups.some(group => group.name === groupName)) {
                alert('A group with this name already exists')
                return
            }

            const newGroup = {
                id: Date.now().toString(),
                name: groupName,
                count: 0
            }

            groups.push(newGroup)

            chrome.storage.sync.set({ groups }, function () {
                newGroupNameElem.value = ''
                loadGroups()
            })
        })
    })

    /**
     * Get info of current tab
     */
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0]

        chrome.tabs.sendMessage(tab.id, { action: "getPaperInfo" }, function (response) {
            if (response && response.title) {
                currentPaper = {
                    title: response.title,
                    url: tab.url,
                    date: new Date().toISOString()
                }
            } else {
                currentPaper = {
                    title: tab.title,
                    url: tab.url,
                    date: new Date().toISOString()
                }
            }

            paperTitleElem.textContent = currentPaper.title
            paperUrlElem.textContent = currentPaper.url
        })
    })

    /**
     * Save current paper
     */
    saveButtonElem.addEventListener('click', function () {
        const groupId = groupSelectElem.value

        if (!groupId) {
            alert('Please select a group')
            return
        }

        chrome.storage.sync.get(['papers', 'groups'], function (result) {
            let papers = result.papers || []
            let groups = result.groups || []

            const isDuplicate = papers.some(paper =>
                paper.url === currentPaper.url && paper.groupId === groupId
            )

            if (isDuplicate) {
                alert('This paper is already saved in this group')
                return
            }

            const newPaper = {
                id: Date.now().toString(),
                title: currentPaper.title,
                url: currentPaper.url,
                date: currentPaper.date,
                groupId: groupId
            }

            papers.push(newPaper)

            groups = groups.map(group => {
                if (group.id === groupId) {
                    group.count = (group.count || 0) + 1
                }
                return group
            })

            chrome.storage.sync.set({ papers, groups }, function () {
                saveButtonElem.textContent = 'Saved!'
                saveButtonElem.disabled = true

                setTimeout(() => {
                    saveButtonElem.textContent = 'Save Paper'
                    saveButtonElem.disabled = false
                }, 1500)

                loadGroups()
                loadPapers()
            })
        })
    })

    /**
     * Load saved papers
     */
    function loadPapers() {
        chrome.storage.sync.get(['papers', 'groups'], function (result) {
            const papers = result.papers || []
            const groups = result.groups || []
            const selectedGroup = filterGroupElem.value

            const filteredPapers = selectedGroup === 'all'
                ? papers
                : papers.filter(paper => paper.groupId === selectedGroup)


            papersContainerElem.innerHTML = ''

            if (filteredPapers.length === 0) {
                const emptyMessage = document.createElement('div')
                emptyMessage.textContent = 'No papers saved yet'
                emptyMessage.style.padding = '16px'
                emptyMessage.style.color = '#5f6368'
                emptyMessage.style.textAlign = 'center'
                emptyMessage.style.fontStyle = 'italic'
                papersContainerElem.appendChild(emptyMessage)
                return
            }


            filteredPapers.forEach(paper => {
                const paperDiv = document.createElement('div')
                paperDiv.className = 'paper-item'

                const titleElem = document.createElement('div')
                titleElem.className = 'paper-item-title'
                titleElem.textContent = paper.title

                const urlElem = document.createElement('div')
                urlElem.className = 'paper-item-url'
                const urlLink = document.createElement('a')
                urlLink.href = paper.url
                urlLink.textContent = 'Open paper'
                urlLink.target = '_blank'
                urlElem.appendChild(urlLink)

                const metaElem = document.createElement('div')
                metaElem.className = 'paper-item-meta'

                const dateElem = document.createElement('span')
                dateElem.textContent = `${new Date(paper.date).toLocaleDateString()}`

                const groupElem = document.createElement('span')
                groupElem.className = 'group-tag'

                const group = groups.find(g => g.id === paper.groupId)
                groupElem.textContent = group ? group.name : 'No group'

                metaElem.appendChild(dateElem)
                metaElem.appendChild(groupElem)

                const controlsElem = document.createElement('div')
                controlsElem.className = 'paper-item-controls'

                const deleteButton = document.createElement('button')
                deleteButton.textContent = 'Delete'
                deleteButton.className = 'danger-button'
                deleteButton.dataset.paperId = paper.id
                deleteButton.addEventListener('click', function () {
                    deletePaper(paper.id, paper.groupId)
                })

                controlsElem.appendChild(deleteButton)
                paperDiv.appendChild(titleElem)
                paperDiv.appendChild(urlElem)
                paperDiv.appendChild(metaElem)
                paperDiv.appendChild(controlsElem)

                papersContainerElem.appendChild(paperDiv)
            })
        })
    }

    /**
     * Delete a paper 
     */
    function deletePaper(paperId, groupId) {
        chrome.storage.sync.get(['papers', 'groups'], function (result) {
            let papers = result.papers || []
            let groups = result.groups || []

            papers = papers.filter(paper => paper.id !== paperId)

            groups = groups.map(group => {
                if (group.id === groupId) {
                    group.count = Math.max(0, (group.count || 0) - 1)
                }
                return group
            })

            chrome.storage.sync.set({ papers, groups }, function () {
                loadGroups()
                loadPapers()
            })
        })
    }

    // "Enter" key for creating groups
    newGroupNameElem.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            createGroupButtonElem.click()
        }
    })

    // Filter change event
    filterGroupElem.addEventListener('change', loadPapers)

    // Load initially
    loadGroups()
    loadPapers()
})