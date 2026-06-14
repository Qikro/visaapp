import os

file_path = r'c:\Users\saipe\visaapp\app.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add references for the new checklist DOM elements
old_vars = """        const submitBtn = document.getElementById('submit-btn');
        const statusMessage = document.getElementById('status-message');
        const buttonText = document.getElementById('button-text');

        const photoDropZone = document.getElementById('photo-drop-zone');"""

new_vars = """        const submitBtn = document.getElementById('submit-btn');
        const statusMessage = document.getElementById('status-message');
        const buttonText = document.getElementById('button-text');

        const checklistContainer = document.getElementById('checklist-container');
        const checklistItems = document.getElementById('checklist-items');
        const checklistHeader = document.getElementById('checklist-header');

        const photoDropZone = document.getElementById('photo-drop-zone');"""

content = content.replace(old_vars, new_vars)

# 2. Update the event listener
old_listener = """        visaTypeSelect.addEventListener('change', (e) => {
            const selectedVisa = e.target.value;
            if (selectedVisa) {
                applicantFormSection.classList.remove('hidden');
                photoSection.classList.remove('hidden');
                checklistSection.classList.remove('hidden');
                uploadSection.classList.remove('hidden');
                updateDocumentList(selectedVisa);
            } else {
                applicantFormSection.classList.add('hidden');
                photoSection.classList.add('hidden');
                checklistSection.classList.add('hidden');
                uploadSection.classList.add('hidden');
            }
            uploadedFilesList = []; displayUploadedFiles(); fileCount.classList.add('hidden'); statusMessage.classList.add('hidden'); updateSubmitButton();
        });"""

new_listener = """        visaTypeSelect.addEventListener('change', (e) => {
            const selectedVisa = e.target.value;
            if (selectedVisa) {
                applicantFormSection.classList.remove('hidden');
                photoSection.classList.remove('hidden');
                uploadSection.classList.remove('hidden');
                
                checklistContainer.classList.remove('hidden');
                setTimeout(() => checklistContainer.classList.remove('opacity-0'), 10);
                
                const selectedVisaName = e.target.options[e.target.selectedIndex].text;
                checklistHeader.textContent = `Required Documents for ${selectedVisaName}`;
                
                updateDocumentList(selectedVisa);
            } else {
                applicantFormSection.classList.add('hidden');
                photoSection.classList.add('hidden');
                uploadSection.classList.add('hidden');
                
                checklistContainer.classList.add('opacity-0');
                setTimeout(() => checklistContainer.classList.add('hidden'), 300);
            }
            uploadedFilesList = []; displayUploadedFiles(); fileCount.classList.add('hidden'); statusMessage.classList.add('hidden'); updateSubmitButton();
        });"""

content = content.replace(old_listener, new_listener)

# 3. Update the updateDocumentList function
old_update = """        function updateDocumentList(visaType) {
            const documents = documentRequirements[visaType] || ['Valid Passport (copy)', 'Proof of Identity', 'Travel Health Insurance', 'Completed Application Form'];
            documentList.innerHTML = '';
            documents.forEach((doc, index) => {
                const item = document.createElement('div');
                item.className = 'document-item flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all';
                item.innerHTML = `<input type="checkbox" id="doc-${index}" class="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-400 cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400" /><label for="doc-${index}" class="flex-1 text-white cursor-pointer font-medium">${doc}</label>`;
                documentList.appendChild(item);
            });
            document.querySelectorAll('#document-list input[type="checkbox"]').forEach(c => c.addEventListener('change', updateChecklistTracker));
            updateChecklistTracker();
        }"""

new_update = """        function updateDocumentList(visaType) {
            const documents = documentRequirements[visaType] || ['Valid Passport (copy)', 'Proof of Identity', 'Travel Health Insurance', 'Completed Application Form'];
            if (checklistItems) {
                checklistItems.innerHTML = '';
                documents.forEach((doc, index) => {
                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between py-3 border-b border-white/10 last:border-0';
                    item.innerHTML = `
                        <div class="flex items-center gap-3">
                            <input type="checkbox" id="dynamic-doc-${index}" class="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-400 cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 transition-all" />
                            <label for="dynamic-doc-${index}" class="text-gray-200 cursor-pointer font-medium">${doc}</label>
                        </div>
                        <button type="button" class="bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg px-4 py-1.5 text-sm transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)]">Upload</button>
                    `;
                    checklistItems.appendChild(item);
                });
                document.querySelectorAll('#checklist-items input[type="checkbox"]').forEach(c => c.addEventListener('change', updateChecklistTracker));
            }
            updateChecklistTracker();
        }"""

content = content.replace(old_update, new_update)

# 4. Update the tracker logic
old_tracker = """        function updateChecklistTracker() {
            const checkboxes = document.querySelectorAll('#document-list input[type="checkbox"]');
            const completed = Array.from(checkboxes).filter(c => c.checked).length;
            document.getElementById('checklist-progress').textContent = `${completed} / ${checkboxes.length} completed`;
        }"""

new_tracker = """        function updateChecklistTracker() {
            const checkboxes = document.querySelectorAll('#checklist-items input[type="checkbox"]');
            const completed = Array.from(checkboxes).filter(c => c.checked).length;
            const progress = document.getElementById('checklist-progress');
            if (progress) progress.textContent = `${completed} / ${checkboxes.length} completed`;
        }"""

content = content.replace(old_tracker, new_tracker)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")