 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import sfGroupLogo from "@/assets/sf-logo-white.png";
 import { 
   ArrowLeft, 
   Mail, 
   Phone, 
   MapPin, 
   Clock, 
   HelpCircle,
   Shield,
   Users,
   Wrench
 } from "lucide-react";
 
 const Contact = () => {
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
               <HelpCircle className="w-6 h-6 text-primary" />
             </div>
             <div>
               <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Contact Us</h1>
               <p className="text-sm text-muted-foreground">Get in touch with the right team</p>
             </div>
           </div>
         </div>
       </section>
 
       {/* Content */}
       <section className="container mx-auto px-6 pb-20">
         <div className="max-w-4xl mx-auto">
           
           {/* Introduction */}
           <div className="card-industrial p-6 mb-8">
             <p className="text-muted-foreground">
               Need help with SF:Team Hub? Choose the appropriate contact below based on your query. 
               Our teams aim to respond within 24 hours during normal business hours.
             </p>
           </div>
 
           {/* Contact Cards Grid */}
           <div className="grid md:grid-cols-2 gap-6 mb-8">
             
             {/* IT Support */}
             <div className="card-industrial p-6">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                   <Wrench className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-foreground mb-1">IT Support</h3>
                   <p className="text-sm text-muted-foreground mb-3">
                     For technical issues, login problems, or app bugs
                   </p>
                   <a 
                     href="mailto:support@sfgroup.co.uk" 
                     className="inline-flex items-center gap-2 text-primary hover:underline"
                   >
                     <Mail className="w-4 h-4" />
                     support@sfgroup.co.uk
                   </a>
                 </div>
               </div>
             </div>
 
             {/* HR Queries */}
             <div className="card-industrial p-6">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                   <Users className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-foreground mb-1">HR Queries</h3>
                   <p className="text-sm text-muted-foreground mb-3">
                     For leave policies, employment matters, or HR questions
                   </p>
                   <a 
                     href="mailto:hr@sfgroup.co.uk" 
                     className="inline-flex items-center gap-2 text-primary hover:underline"
                   >
                     <Mail className="w-4 h-4" />
                     hr@sfgroup.co.uk
                   </a>
                 </div>
               </div>
             </div>
 
             {/* Data Protection */}
             <div className="card-industrial p-6">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                   <Shield className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-foreground mb-1">Data Protection</h3>
                   <p className="text-sm text-muted-foreground mb-3">
                     For privacy concerns, data requests, or GDPR enquiries
                   </p>
                   <a 
                     href="mailto:dpo@sfgroup.co.uk" 
                     className="inline-flex items-center gap-2 text-primary hover:underline"
                   >
                     <Mail className="w-4 h-4" />
                     dpo@sfgroup.co.uk
                   </a>
                 </div>
               </div>
             </div>
 
             {/* General Enquiries */}
             <div className="card-industrial p-6">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                   <HelpCircle className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-foreground mb-1">General Enquiries</h3>
                   <p className="text-sm text-muted-foreground mb-3">
                     For all other questions or feedback
                   </p>
                   <a 
                     href="mailto:info@sfgroup.co.uk" 
                     className="inline-flex items-center gap-2 text-primary hover:underline"
                   >
                     <Mail className="w-4 h-4" />
                     info@sfgroup.co.uk
                   </a>
                 </div>
               </div>
             </div>
 
           </div>
 
           {/* Office Details */}
           <div className="card-industrial p-6 mb-8">
             <h2 className="text-xl font-semibold text-foreground mb-4">Head Office</h2>
             <div className="grid md:grid-cols-2 gap-6">
               <div className="flex items-start gap-3">
                 <MapPin className="w-5 h-5 text-primary mt-0.5" />
                 <div>
                   <p className="font-medium text-foreground">Address</p>
                   <p className="text-muted-foreground">
                     SF Group<br />
                     123 Industrial Way<br />
                     Ashford, Kent TN24 0XX<br />
                     United Kingdom
                   </p>
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="flex items-start gap-3">
                   <Phone className="w-5 h-5 text-primary mt-0.5" />
                   <div>
                     <p className="font-medium text-foreground">Phone</p>
                     <p className="text-muted-foreground">+44 (0) 1234 567890</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Clock className="w-5 h-5 text-primary mt-0.5" />
                   <div>
                     <p className="font-medium text-foreground">Support Hours</p>
                     <p className="text-muted-foreground">Monday – Friday: 8:00 – 18:00</p>
                     <p className="text-sm text-muted-foreground">Excluding UK bank holidays</p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
 
           {/* Response Times */}
           <div className="card-industrial p-6 mb-8">
             <h2 className="text-xl font-semibold text-foreground mb-3">Response Times</h2>
             <p className="text-muted-foreground mb-4">
               We aim to respond to all enquiries within the following timeframes:
             </p>
             <ul className="space-y-2 text-muted-foreground">
               <li className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 <span><span className="font-medium text-foreground">IT Support:</span> Within 4 hours for urgent issues</span>
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 <span><span className="font-medium text-foreground">HR Queries:</span> Within 2 business days</span>
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 <span><span className="font-medium text-foreground">Data Protection:</span> Within 30 days for formal requests</span>
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 <span><span className="font-medium text-foreground">General Enquiries:</span> Within 3 business days</span>
               </li>
             </ul>
           </div>
 
           {/* Quick Links */}
           <div className="card-industrial p-6">
             <h2 className="text-xl font-semibold text-foreground mb-3">Helpful Resources</h2>
             <div className="flex flex-wrap gap-4">
               <Link 
                 to="/terms" 
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
               >
                 Terms of Use
               </Link>
               <Link 
                 to="/privacy" 
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
               >
                 Privacy Policy
               </Link>
               <Link 
                 to="/install" 
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
               >
                 Install the App
               </Link>
             </div>
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
               <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                 Terms of Use
               </Link>
               <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                 Privacy Policy
               </Link>
               <span className="text-foreground font-medium">Contact</span>
             </div>
           </div>
         </div>
       </footer>
     </div>
   );
 };
 
 export default Contact;