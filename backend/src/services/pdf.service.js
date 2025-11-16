import PDFDocument from 'pdfkit';
import { supabase } from '../models/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service de génération PDF pour les devis
 */
class PDFService {
  /**
   * Générer un PDF de devis
   */
  async generateDevisPDF(devis, user) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            
            // Upload vers Supabase Storage
            const fileName = `devis-${devis.id}-${Date.now()}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('devis')
              .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false,
              });

            if (uploadError) {
              console.error('PDF upload error:', uploadError);
              reject(new Error('Failed to upload PDF'));
              return;
            }

            // Obtenir l'URL publique
            const { data: { publicUrl } } = supabase.storage
              .from('devis')
              .getPublicUrl(fileName);

            resolve({
              pdfPath: fileName,
              pdfUrl: publicUrl,
              buffer: pdfBuffer,
            });
          } catch (error) {
            reject(error);
          }
        });
        doc.on('error', reject);

        // En-tête
        doc.fontSize(20).text('DEVIS', { align: 'center' });
        doc.moveDown();

        // Informations entreprise
        if (user.company_name) {
          doc.fontSize(14).text(user.company_name, { align: 'left' });
        }
        if (user.email) {
          doc.fontSize(10).text(`Email: ${user.email}`, { align: 'left' });
        }
        if (user.phone) {
          doc.fontSize(10).text(`Téléphone: ${user.phone}`, { align: 'left' });
        }
        doc.moveDown();

        // Informations client
        doc.fontSize(12).text('Client:', { underline: true });
        if (devis.contact_name) {
          doc.fontSize(10).text(`Nom: ${devis.contact_name}`);
        }
        doc.fontSize(10).text(`Téléphone: ${devis.contact_phone}`);
        doc.moveDown();

        // Date
        doc.fontSize(10).text(
          `Date: ${new Date(devis.created_at).toLocaleDateString('fr-FR')}`,
          { align: 'right' }
        );
        doc.moveDown(2);

        // Tableau des items
        const tableTop = doc.y;
        const itemHeight = 20;
        let currentY = tableTop;

        // En-tête du tableau
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Produit', 50, currentY);
        doc.text('Qté', 250, currentY);
        doc.text('Prix unit.', 300, currentY);
        doc.text('Total', 400, currentY, { align: 'right' });
        currentY += itemHeight;

        // Ligne de séparation
        doc.moveTo(50, currentY).lineTo(500, currentY).stroke();
        currentY += 5;

        // Items
        doc.fontSize(10).font('Helvetica');
        const items = Array.isArray(devis.items) ? devis.items : [];
        
        items.forEach((item) => {
          const title = item.title || 'Produit';
          const quantity = item.quantity || 1;
          const price = parseFloat(item.price) || 0;
          const total = quantity * price;

          doc.text(title.substring(0, 30), 50, currentY);
          doc.text(quantity.toString(), 250, currentY);
          doc.text(`${price.toFixed(2)} ${devis.currency || 'MGA'}`, 300, currentY);
          doc.text(`${total.toFixed(2)} ${devis.currency || 'MGA'}`, 400, currentY, { align: 'right' });
          currentY += itemHeight;
        });

        // Totaux
        currentY += 10;
        doc.moveTo(50, currentY).lineTo(500, currentY).stroke();
        currentY += 10;

        doc.font('Helvetica-Bold');
        doc.text('Sous-total:', 300, currentY);
        doc.text(
          `${(devis.subtotal || 0).toFixed(2)} ${devis.currency || 'MGA'}`,
          400,
          currentY,
          { align: 'right' }
        );
        currentY += itemHeight;

        if (devis.tax && devis.tax > 0) {
          doc.font('Helvetica');
          doc.text('TVA:', 300, currentY);
          doc.text(
            `${devis.tax.toFixed(2)} ${devis.currency || 'MGA'}`,
            400,
            currentY,
            { align: 'right' }
          );
          currentY += itemHeight;
        }

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('TOTAL:', 300, currentY);
        doc.text(
          `${(devis.total || 0).toFixed(2)} ${devis.currency || 'MGA'}`,
          400,
          currentY,
          { align: 'right' }
        );

        // Pied de page
        doc.fontSize(8).font('Helvetica');
        doc.text(
          'Ce devis est valable 30 jours.',
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new PDFService();

