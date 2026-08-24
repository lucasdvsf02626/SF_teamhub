 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import sfGroupLogo from "@/assets/sf-logo-white.png";
 import { ArrowLeft, Shield } from "lucide-react";
 
 const PrivacyPolicy = () => {
   return (
     <div className="min-h-screen gradient-hero">
       {/* Header */}
       <header className="border-b border-border/50">
         <div className="container mx-auto px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <img 
               src={sfGroupLogo} 
               alt="SF Group" 
               className="h-[60px] w-auto"
             />
             <div className="border-l border-border pl-3">
               <h1 className="font-bold text-lg text-foreground">Team Hub</h1>
               <p className="text-xs text-muted-foreground">Powered by Panacea</p>
             </div>
           </div>
           <Link to="/">
             <Button variant="outline" size="sm" className="gap-2">
               <ArrowLeft className="w-4 h-4" />
               Back to Home
             </Button>
           </Link>
         </div>
       </header>
 
       {/* Page Title */}
       <section className="container mx-auto px-6 py-12">
         <div className="max-w-4xl mx-auto">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
               <Shield className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Privacy Policy</h1>
               <p className="text-sm text-muted-foreground">Last updated: February 2025</p>
             </div>
           </div>
         </div>
       </section>
 
       {/* Content */}
       <section className="container mx-auto px-6 pb-20">
         <div className="max-w-4xl mx-auto space-y-6">
           
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
             <p className="text-muted-foreground">
               SF:Team Hub is an internal staff portal operated by SF Group for managing employee 
               attendance, leave, and related workplace activities. This Privacy Policy explains 
               how we collect, use, store, and protect your personal data when you use this Platform. 
               We are committed to protecting your privacy and handling your data in accordance with 
               the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">2. Data Controller</h2>
             <p className="text-muted-foreground mb-3">
               The data controller for information processed through this Platform is:
             </p>
             <div className="bg-muted/50 rounded-lg p-4 text-muted-foreground">
               <p className="font-medium text-foreground">SF Group</p>
               <p>123 Industrial Way</p>
               <p>Ashford, Kent TN24 0XX</p>
               <p>United Kingdom</p>
               <p className="mt-2">
                 Data Protection Officer: <a href="mailto:dpo@sfgroup.co.uk" className="text-primary hover:underline">dpo@sfgroup.co.uk</a>
               </p>
             </div>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">3. Data We Collect</h2>
             <p className="text-muted-foreground mb-4">We collect and process the following categories of personal data:</p>
             
             <h3 className="font-medium text-foreground mb-2">Personal Information</h3>
             <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
               <li>Full name, email address, and phone number</li>
               <li>Job title, department, and employer (SF Group company)</li>
               <li>Employee/payroll ID</li>
               <li>Start date and date of birth</li>
               <li>Profile photograph (if uploaded)</li>
               <li>Line manager information</li>
             </ul>
 
             <h3 className="font-medium text-foreground mb-2">Attendance & Presence Data</h3>
             <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
               <li>Sign in/out times and dates</li>
               <li>Site/location where you signed in</li>
               <li>Device location data (if geolocation is enabled)</li>
               <li>Method of sign in (mobile app, kiosk, QR code)</li>
             </ul>
 
             <h3 className="font-medium text-foreground mb-2">Leave & Absence Data</h3>
             <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
               <li>Leave requests (dates, type, reason if provided)</li>
               <li>Sickness absence records</li>
               <li>Return to work form responses</li>
               <li>Leave balances and entitlements</li>
             </ul>
 
             <h3 className="font-medium text-foreground mb-2">Certification Records</h3>
             <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
               <li>Professional certifications (e.g., First Aid, Fire Marshal)</li>
               <li>Expiry dates and renewal information</li>
               <li>Certificate numbers and issuing authorities</li>
             </ul>
 
             <h3 className="font-medium text-foreground mb-2">Technical Data</h3>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>Device type and browser information</li>
               <li>IP address and session data</li>
               <li>Login timestamps and activity logs</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">4. Purposes of Processing</h2>
             <p className="text-muted-foreground mb-3">We process your personal data for:</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>Managing employee attendance and workplace presence</li>
               <li>Processing and approving leave requests</li>
               <li>Calculating leave balances and entitlements</li>
               <li>Health and safety compliance (knowing who is on site)</li>
               <li>Managing professional certification requirements</li>
               <li>Payroll and HR administration</li>
               <li>Team management and workforce planning</li>
               <li>Security and access control</li>
               <li>Improving Platform functionality and user experience</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">5. Legal Basis</h2>
             <p className="text-muted-foreground mb-3">
               We process your data under the following legal bases:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-2">
               <li><span className="font-medium text-foreground">Contract Performance:</span> Processing is necessary for the performance of your employment contract</li>
               <li><span className="font-medium text-foreground">Legal Obligation:</span> We are required to maintain certain records for legal compliance</li>
               <li><span className="font-medium text-foreground">Legitimate Interests:</span> Managing workplace operations, security, and health & safety</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
             <p className="text-muted-foreground mb-3">We retain your data for the following periods:</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li><span className="font-medium text-foreground">Active employment:</span> Data is retained throughout your employment</li>
               <li><span className="font-medium text-foreground">After leaving:</span> Core records retained for 6 years after employment ends</li>
               <li><span className="font-medium text-foreground">Attendance logs:</span> Retained for 3 years</li>
               <li><span className="font-medium text-foreground">Technical logs:</span> Retained for 12 months</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Sharing</h2>
             <p className="text-muted-foreground mb-3">Your data may be shared with:</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li><span className="font-medium text-foreground">SF Group companies:</span> For HR and payroll administration</li>
               <li><span className="font-medium text-foreground">The Hive:</span> Our integrated HR system for data synchronisation</li>
               <li><span className="font-medium text-foreground">Your line manager:</span> For team management and approvals</li>
               <li><span className="font-medium text-foreground">HR department:</span> For employment administration</li>
               <li><span className="font-medium text-foreground">IT service providers:</span> For Platform hosting and maintenance (under strict data processing agreements)</li>
             </ul>
             <p className="text-muted-foreground mt-3">
               We do not sell your personal data or share it with third parties for marketing purposes.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
             <p className="text-muted-foreground mb-3">Under UK GDPR, you have the right to:</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li><span className="font-medium text-foreground">Access:</span> Request a copy of your personal data</li>
               <li><span className="font-medium text-foreground">Rectification:</span> Request correction of inaccurate data</li>
               <li><span className="font-medium text-foreground">Erasure:</span> Request deletion of your data (subject to legal retention requirements)</li>
               <li><span className="font-medium text-foreground">Restriction:</span> Request limitation of processing in certain circumstances</li>
               <li><span className="font-medium text-foreground">Portability:</span> Receive your data in a portable format</li>
               <li><span className="font-medium text-foreground">Object:</span> Object to processing based on legitimate interests</li>
             </ul>
             <p className="text-muted-foreground mt-3">
               To exercise these rights, contact our Data Protection Officer at{" "}
               <a href="mailto:dpo@sfgroup.co.uk" className="text-primary hover:underline">dpo@sfgroup.co.uk</a>.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">9. Data Security</h2>
             <p className="text-muted-foreground mb-3">
               We implement appropriate technical and organisational measures to protect your data, including:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>Encryption in transit and at rest</li>
               <li>Secure authentication and session management</li>
               <li>Role-based access controls</li>
               <li>Regular security assessments</li>
               <li>Staff training on data protection</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">10. Cookies & Local Storage</h2>
             <p className="text-muted-foreground">
               The Platform uses cookies and local storage for essential functionality, including 
               maintaining your login session and storing your preferences. These are necessary 
               for the Platform to operate and cannot be disabled. We do not use cookies for 
               advertising or tracking purposes.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">11. Changes to This Policy</h2>
             <p className="text-muted-foreground">
               We may update this Privacy Policy from time to time. Material changes will be 
               communicated through the Platform or via email. The "Last updated" date at the 
               top of this page indicates when the policy was last revised.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">12. Complaints</h2>
             <p className="text-muted-foreground">
               If you have concerns about how we handle your data, please contact our Data Protection 
               Officer first. You also have the right to lodge a complaint with the Information 
               Commissioner's Office (ICO) at{" "}
               <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a>.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact</h2>
             <p className="text-muted-foreground">
               For data protection queries, contact our Data Protection Officer at{" "}
               <a href="mailto:dpo@sfgroup.co.uk" className="text-primary hover:underline">dpo@sfgroup.co.uk</a>. 
               For general enquiries, visit the <Link to="/contact" className="text-primary hover:underline">Contact page</Link>.
             </p>
           </div>
 
         </div>
       </section>
 
       {/* Footer */}
       <footer className="border-t border-border/50 py-8">
         <div className="container mx-auto px-6">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Your data, handled properly. Nothing extra. Nothing hidden. Built for trust. Powered by <a href="https://panacea-website.lovable.app/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors font-semibold">PANACEA</a>.
              </p>
             <div className="flex items-center gap-6 text-sm">
               <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                 Terms of Use
               </Link>
               <span className="text-foreground font-medium">Privacy Policy</span>
               <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                 Contact
               </Link>
             </div>
           </div>
         </div>
       </footer>
     </div>
   );
 };
 
 export default PrivacyPolicy;