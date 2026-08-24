 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import sfGroupLogo from "@/assets/sf-logo-white.png";
 import { ArrowLeft, FileText } from "lucide-react";
 
 const TermsOfUse = () => {
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
               <FileText className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Terms of Use</h1>
               <p className="text-sm text-muted-foreground">Last updated: February 2025</p>
             </div>
           </div>
         </div>
       </section>
 
       {/* Content */}
       <section className="container mx-auto px-6 pb-20">
         <div className="max-w-4xl mx-auto space-y-6">
           
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
             <p className="text-muted-foreground">
               By accessing and using SF:Team Hub ("the Platform"), you acknowledge that you have read, 
               understood, and agree to be bound by these Terms of Use. If you do not agree to these terms, 
               you must not access or use the Platform.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">2. Eligibility</h2>
             <p className="text-muted-foreground">
               Access to this Platform is restricted to current employees, contractors, and authorised 
               personnel of SF Group companies. You must have valid credentials issued by your employer 
               to use this service. Unauthorised access is strictly prohibited and may result in 
               disciplinary action and/or legal proceedings.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">3. Authorised Use</h2>
             <p className="text-muted-foreground mb-3">
               The Platform is provided for the following purposes:
             </p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>Recording attendance and presence at SF Group sites</li>
               <li>Submitting and managing leave requests</li>
               <li>Viewing team and colleague presence information</li>
               <li>Managing personal profile and certification records</li>
               <li>Receiving work-related notifications and communications</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">4. Account Responsibilities</h2>
             <p className="text-muted-foreground mb-3">You are responsible for:</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>Maintaining the confidentiality of your login credentials</li>
               <li>All activities that occur under your account</li>
               <li>Notifying IT Support immediately if you suspect unauthorised access</li>
               <li>Ensuring accurate sign in/out records that reflect your actual presence</li>
               <li>Keeping your profile information up to date</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">5. Prohibited Activities</h2>
             <p className="text-muted-foreground mb-3">You must not:</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>Share your login credentials with any other person</li>
               <li>Sign in or out on behalf of another employee</li>
               <li>Submit false or misleading attendance or leave information</li>
               <li>Attempt to access areas of the Platform not authorised for your role</li>
               <li>Use the Platform for any purpose other than legitimate work activities</li>
               <li>Attempt to circumvent security measures or exploit vulnerabilities</li>
               <li>Copy, modify, or distribute any Platform content without authorisation</li>
             </ul>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Accuracy</h2>
             <p className="text-muted-foreground">
               You are responsible for ensuring that all information you submit through the Platform 
               is accurate, complete, and up to date. This includes attendance records, leave requests, 
               and personal profile information. Submitting false information may constitute a 
               disciplinary offence under your employment contract.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
             <p className="text-muted-foreground">
               The Platform, including all software, design, logos, and content, is the property of 
               SF Group or its licensors. All rights are reserved. You are granted a limited, 
               non-exclusive licence to use the Platform solely for its intended purpose during 
               your employment or engagement with SF Group.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">8. Termination</h2>
             <p className="text-muted-foreground">
               Your access to the Platform will be terminated upon the end of your employment or 
               engagement with SF Group. Access may also be suspended or terminated at any time 
               if you breach these Terms of Use or your employment contract, or if required for 
               security or operational reasons.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">9. Disclaimer of Warranties</h2>
             <p className="text-muted-foreground">
               The Platform is provided "as is" without warranties of any kind, either express or 
               implied. While we strive to maintain continuous service, we do not guarantee 
               uninterrupted access or that the Platform will be free from errors. Scheduled 
               maintenance may occasionally affect availability.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
             <p className="text-muted-foreground">
               To the fullest extent permitted by law, SF Group shall not be liable for any 
               indirect, incidental, special, or consequential damages arising from your use 
               of the Platform. Our liability for any claim shall not exceed the amount paid 
               by you for use of the Platform (which is nil for employees).
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">11. Governing Law</h2>
             <p className="text-muted-foreground">
               These Terms of Use shall be governed by and construed in accordance with the laws 
               of England and Wales. Any disputes arising from these terms shall be subject to 
               the exclusive jurisdiction of the courts of England and Wales.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">12. Changes to Terms</h2>
             <p className="text-muted-foreground">
               SF Group reserves the right to modify these Terms of Use at any time. Material 
               changes will be communicated through the Platform or via email. Continued use 
               of the Platform after changes are posted constitutes acceptance of the revised terms.
             </p>
           </div>
 
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">13. Contact</h2>
             <p className="text-muted-foreground">
               If you have any questions about these Terms of Use, please contact IT Support 
               at <a href="mailto:support@sfgroup.co.uk" className="text-primary hover:underline">support@sfgroup.co.uk</a> or 
               visit the <Link to="/contact" className="text-primary hover:underline">Contact page</Link>.
             </p>
           </div>
 
         </div>
       </section>
 
       {/* Footer */}
       <footer className="border-t border-border/50 py-8">
         <div className="container mx-auto px-6">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-sm text-muted-foreground">
               SF:Team Hub — Part of the Panacea Ecosystem
             </p>
             <div className="flex items-center gap-6 text-sm">
               <span className="text-foreground font-medium">Terms of Use</span>
               <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                 Privacy Policy
               </Link>
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
 
 export default TermsOfUse;