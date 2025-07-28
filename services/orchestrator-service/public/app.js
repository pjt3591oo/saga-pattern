let currentPage = 1;
let autoRefreshInterval;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSagas();
    startAutoRefresh();
    
    // Event listeners
    document.getElementById('statusFilter').addEventListener('change', () => {
        currentPage = 1;
        loadSagas();
    });
    
    document.getElementById('limitSelect').addEventListener('change', () => {
        currentPage = 1;
        loadSagas();
    });
    
    document.getElementById('autoRefreshCheck').addEventListener('change', (e) => {
        if (e.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
});

function startAutoRefresh() {
    autoRefreshInterval = setInterval(loadSagas, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

async function loadSagas() {
    try {
        const statusFilter = document.getElementById('statusFilter');
        const selectedStatuses = Array.from(statusFilter.selectedOptions)
            .map(option => option.value)
            .filter(value => value !== '');
        
        const limit = document.getElementById('limitSelect').value;
        
        // Build query parameters
        let queryParams = `?page=${currentPage}&limit=${limit}`;
        if (selectedStatuses.length > 0) {
            selectedStatuses.forEach(status => {
                queryParams += `&status[]=${status}`;
            });
        }
        
        const response = await fetch(`/api/orchestrator/sagas${queryParams}`);
        const result = await response.json();
        
        if (response.ok) {
            displaySagas(result.data);
            updatePagination(result.pagination);
            updateStats(result.data);
        } else {
            showMessage('Error loading sagas: ' + result.message, 'error');
        }
    } catch (error) {
        showMessage('Error loading sagas: ' + error.message, 'error');
    }
}

function displaySagas(sagas) {
    const tbody = document.getElementById('sagaTableBody');
    
    if (sagas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No sagas found</td></tr>';
        return;
    }
    
    tbody.innerHTML = sagas.map(saga => `
        <tr>
            <td>${saga.sagaId.substring(0, 8)}...</td>
            <td>${saga.orderId.substring(0, 8)}...</td>
            <td><span class="status ${saga.status}">${saga.status}</span></td>
            <td>${saga.currentStep || '-'}</td>
            <td>${saga.orderData?.customerId || '-'}</td>
            <td>$${saga.orderData?.totalAmount?.toFixed(2) || '-'}</td>
            <td>${new Date(saga.createdAt).toLocaleString()}</td>
            <td>
                <button class="retry-btn" 
                        onclick="showDetails('${saga.sagaId}')"
                        style="margin-right: 5px;">Details</button>
                ${canRetry(saga) ? 
                    `<button class="retry-btn" onclick="retrySaga('${saga.sagaId}')">Retry</button>` : 
                    `<button class="retry-btn" disabled>Retry</button>`
                }
            </td>
        </tr>
    `).join('');
}

function canRetry(saga) {
    return ['FAILED', 'COMPENSATED'].includes(saga.status) && saga.currentStep !== 'COMPLETED';
}

function updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    let html = '';
    
    // Previous button
    html += `<button onclick="changePage(${currentPage - 1})" ${!pagination.hasPrevPage ? 'disabled' : ''}>Previous</button>`;
    
    // Page info
    html += `<span>Page ${pagination.currentPage} of ${pagination.totalPages} (Total: ${pagination.totalCount})</span>`;
    
    // Next button
    html += `<button onclick="changePage(${currentPage + 1})" ${!pagination.hasNextPage ? 'disabled' : ''}>Next</button>`;
    
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadSagas();
}

async function updateStats(sagas) {
    try {
        // Get all sagas for accurate stats
        const response = await fetch('/api/orchestrator/sagas?limit=1000');
        const result = await response.json();
        
        if (response.ok) {
            const allSagas = result.data;
            
            document.getElementById('totalCount').textContent = result.pagination.totalCount;
            document.getElementById('completedCount').textContent = 
                allSagas.filter(s => s.status === 'COMPLETED').length;
            document.getElementById('failedCount').textContent = 
                allSagas.filter(s => s.status === 'FAILED').length;
            document.getElementById('inProgressCount').textContent = 
                allSagas.filter(s => !['COMPLETED', 'FAILED', 'COMPENSATED'].includes(s.status)).length;
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function retrySaga(sagaId) {
    if (!confirm('Are you sure you want to retry this saga?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/orchestrator/sagas/${sagaId}/retry`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Saga retry initiated successfully', 'success');
            setTimeout(loadSagas, 1000);
        } else {
            showMessage('Error retrying saga: ' + result.message, 'error');
        }
    } catch (error) {
        showMessage('Error retrying saga: ' + error.message, 'error');
    }
}

async function retryAllFailed() {
    if (!confirm('Are you sure you want to retry all failed sagas?')) {
        return;
    }
    
    try {
        // Get all failed sagas
        const response = await fetch('/api/orchestrator/sagas?status[]=FAILED&status[]=COMPENSATED&limit=100');
        const result = await response.json();
        
        if (!response.ok) {
            showMessage('Error fetching failed sagas', 'error');
            return;
        }
        
        const failedSagas = result.data.filter(saga => canRetry(saga));
        
        if (failedSagas.length === 0) {
            showMessage('No failed sagas to retry', 'error');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Retry each failed saga
        for (const saga of failedSagas) {
            try {
                const retryResponse = await fetch(`/api/orchestrator/sagas/${saga.sagaId}/retry`, {
                    method: 'POST'
                });
                
                if (retryResponse.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }
        
        showMessage(`Retry completed: ${successCount} succeeded, ${errorCount} failed`, 
                   errorCount > 0 ? 'error' : 'success');
        setTimeout(loadSagas, 1000);
        
    } catch (error) {
        showMessage('Error retrying failed sagas: ' + error.message, 'error');
    }
}

async function showDetails(sagaId) {
    try {
        const response = await fetch(`/api/orchestrator/sagas/${sagaId}`);
        const saga = await response.json();
        
        if (response.ok) {
            const modal = document.getElementById('detailModal');
            const modalContent = document.getElementById('modalContent');
            
            modalContent.innerHTML = `
                <div class="saga-details">
                    <p><strong>Saga ID:</strong> ${saga.sagaId}</p>
                    <p><strong>Order ID:</strong> ${saga.orderId}</p>
                    <p><strong>Status:</strong> <span class="status ${saga.status}">${saga.status}</span></p>
                    <p><strong>Current Step:</strong> ${saga.currentStep || '-'}</p>
                    <p><strong>Created:</strong> ${new Date(saga.createdAt).toLocaleString()}</p>
                    <p><strong>Updated:</strong> ${new Date(saga.updatedAt).toLocaleString()}</p>
                    
                    ${saga.compensationReason ? 
                        `<p><strong>Compensation Reason:</strong> ${saga.compensationReason}</p>` : ''}
                    
                    <h3>Order Data</h3>
                    <div class="step-info">
                        <p><strong>Customer ID:</strong> ${saga.orderData?.customerId || '-'}</p>
                        <p><strong>Total Amount:</strong> $${saga.orderData?.totalAmount?.toFixed(2) || '-'}</p>
                        <p><strong>Items:</strong></p>
                        <ul>
                            ${saga.orderData?.items?.map(item => `
                                <li>${item.productName} - Qty: ${item.quantity} - $${item.price}</li>
                            `).join('') || '<li>No items</li>'}
                        </ul>
                    </div>
                    
                    <h3>Steps</h3>
                    ${saga.steps?.map(step => `
                        <div class="step-info">
                            <h4>${step.name} - <span class="status ${step.status}">${step.status}</span></h4>
                            ${step.startedAt ? `<p><strong>Started:</strong> ${new Date(step.startedAt).toLocaleString()}</p>` : ''}
                            ${step.completedAt ? `<p><strong>Completed:</strong> ${new Date(step.completedAt).toLocaleString()}</p>` : ''}
                            ${step.error ? `<p><strong>Error:</strong> ${step.error}</p>` : ''}
                        </div>
                    `).join('') || '<p>No steps</p>'}
                    
                    ${saga.retryHistory && saga.retryHistory.length > 0 ? `
                        <h3>Retry History</h3>
                        ${saga.retryHistory.map(retry => `
                            <div class="step-info">
                                <p><strong>Retry At:</strong> ${new Date(retry.retryAt).toLocaleString()}</p>
                                <p><strong>From Step:</strong> ${retry.fromStep}</p>
                                <p><strong>Result:</strong> ${retry.result}</p>
                                ${retry.error ? `<p><strong>Error:</strong> ${retry.error}</p>` : ''}
                            </div>
                        `).join('')}
                    ` : ''}
                </div>
            `;
            
            modal.style.display = 'block';
        } else {
            showMessage('Error loading saga details', 'error');
        }
    } catch (error) {
        showMessage('Error loading saga details: ' + error.message, 'error');
    }
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = type;
    messageDiv.textContent = message;
    
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = '';
    }, 5000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}