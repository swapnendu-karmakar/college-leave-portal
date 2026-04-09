import { jsPDF } from 'jspdf';
import { formatDate, getProofStatusText } from './validators';

/**
 * Generates a modern university-style PDF for a leave application.
 * @param {Object} application The leave application object from Supabase.
 * @param {string} outputType 'save' -> triggers browser download, 'datauristring' -> returns base64.
 * @returns {string|void} The base64 URL if 'datauristring' requested, otherwise undefined (downloads).
 */
export const generateApplicationPDF = (application, outputType = 'save') => {
    if (!application) return null;

    const doc = new jsPDF();
    
    // Setup colors
    const primaryColor = [91, 33, 182]; // Deep violet
    const secondaryColor = [243, 244, 246]; // Light gray background for sections
    const textColor = [55, 65, 81];
    const labelColor = [107, 114, 128];
    const accentColor = [139, 92, 246]; // Lighter purple for borders

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(application.college?.name || 'COLLEGE LEAVE PORTAL', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL LEAVE APPLICATION RECORD', 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Application ID: ${application.application_id}`, 105, 36, { align: 'center' });

    let currentY = 55;

    // Draw Status Badge Pill
    const statusColor = application.status === 'approved' ? [220, 252, 231] : 
                        application.status === 'rejected' ? [254, 226, 226] : [254, 249, 195];
    const statusTextColor = application.status === 'approved' ? [21, 128, 61] : 
                            application.status === 'rejected' ? [185, 28, 28] : [161, 98, 7];
    
    doc.setFillColor(...statusColor);
    doc.roundedRect(14, currentY, 40, 8, 3, 3, 'F');
    doc.setTextColor(...statusTextColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`STATUS: ${(application.status || 'pending').toUpperCase()}`, 34, currentY + 5.5, { align: 'center' });
    currentY += 15;

    // Section Drawer
    const drawSection = (title, dataFields) => {
        if (currentY > 260) {
            doc.addPage();
            currentY = 20;
        }

        // Draw Section Header
        doc.setFillColor(...secondaryColor);
        doc.rect(14, currentY, 182, 10, 'F');
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(0.5);
        doc.line(14, currentY, 14, currentY + 10); // Left border accent
        
        doc.setTextColor(...primaryColor);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), 18, currentY + 7);
        
        currentY += 15;
        doc.setFontSize(10);
        
        let isLeft = true;
        
        for (let i = 0; i < dataFields.length; i++) {
            const field = dataFields[i];
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }

            if (field.fullWidth) {
                if (!isLeft) { currentY += 8; isLeft = true; } 
                
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...labelColor);
                doc.text(`${field.label}:`, 14, currentY);
                
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...textColor);
                const splitText = doc.splitTextToSize(String(field.value || 'N/A'), 182);
                doc.text(splitText, 14, currentY + 5);
                currentY += 5 + (splitText.length * 5) + 3;
            } else {
                const xLabel = isLeft ? 14 : 110;
                const xValue = isLeft ? 45 : 141;
                
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...labelColor);
                doc.text(`${field.label}:`, xLabel, currentY);
                
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...textColor);
                const val = String(field.value || 'N/A');
                const splitText = doc.splitTextToSize(val, 60);
                doc.text(splitText, xValue, currentY);
                
                const textHeight = splitText.length * 5;
                
                if (isLeft) {
                    isLeft = false;
                    field.leftHeight = textHeight;
                } else {
                    isLeft = true;
                    const prevHeight = dataFields[i - 1]?.leftHeight || 5;
                    currentY += Math.max(textHeight, prevHeight) + 3;
                }
            }
        }
        if (!isLeft) currentY += 8;
        currentY += 5; 
    };

    // Populate Data
    drawSection('Student Information', [
        { label: 'Name', value: application.student_name },
        { label: 'Enrollment', value: application.enrollment_number },
        { label: 'Email', value: application.email, fullWidth: true }
    ]);

    drawSection('Academic Details', [
        { label: 'College', value: application.college?.name },
        { label: 'Department', value: application.department?.name },
        { label: 'Branch', value: application.branch?.name },
        { label: 'Division', value: application.division?.code }
    ]);

    const leaveFields = [
        { label: 'Leave Type', value: application.leave_type },
        { label: 'Submitted On', value: formatDate(application.created_at) },
        { label: 'From Date', value: formatDate(application.from_date) },
        { label: 'To Date', value: formatDate(application.to_date) }
    ];
    
    if (application.reviewed_at) {
        leaveFields.push({ label: 'Reviewed On', value: formatDate(application.reviewed_at), fullWidth: true });
    }
    
    leaveFields.push({ label: 'Reason', value: application.reason, fullWidth: true });
    
    if (application.faculty_remark) {
       leaveFields.push({ label: 'Faculty Remark', value: application.faculty_remark, fullWidth: true });
    }
    if (application.student_reply) {
       leaveFields.push({ label: 'Student Reply', value: application.student_reply, fullWidth: true });
    }

    drawSection('Leave Details & Remarks', leaveFields);

    // Dynamic categories
    if (application.category_details && Object.keys(application.category_details).length > 0) {
         const catFields = Object.entries(application.category_details).map(([key, val]) => ({
             label: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase()),
             value: val
         }));
         drawSection(`${application.leave_type} Details`, catFields);
    }

    if (application.category_results && Object.keys(application.category_results).length > 0) {
         const resFields = Object.entries(application.category_results).map(([key, val]) => ({
             label: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase()),
             value: val
         }));
         drawSection('Submitted Results', resFields);
    }

    // Footer Pages
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by College Leave Portal on ${new Date().toLocaleString()}  |  Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    if (outputType === 'datauristring') {
        return doc.output('datauristring');
    }

    // Default save
    doc.save(`Leave_Application_${application.application_id}.pdf`);
};
