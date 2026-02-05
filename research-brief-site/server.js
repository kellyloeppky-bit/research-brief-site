const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Generate research brief endpoint
app.post('/api/generate-brief', (req, res) => {
  const { companyName, techStack, competitors } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  // Generate comprehensive research brief
  const brief = generateResearchBrief(companyName, techStack, competitors);
  res.json({ brief });
});

function generateResearchBrief(companyName, techStack, competitors) {
  const competitorsList = competitors && competitors.length > 0
    ? competitors.join(', ')
    : 'Not specified';

  const techStackInfo = techStack && techStack.trim()
    ? techStack.trim()
    : 'Not specified';

  return `SALES RESEARCH BRIEF
Generated: ${new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPANY OVERVIEW: ${companyName}

${companyName} is a key prospect in our sales pipeline. Understanding their business landscape, technology infrastructure, and competitive positioning is crucial for developing a tailored CDW solution approach.

Current Technology Stack:
${techStackInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECENT DEVELOPMENTS

Industry Context:
• Digital transformation initiatives continue to drive IT spending
• Cloud migration and hybrid infrastructure remain top priorities
• Cybersecurity investments increasing due to evolving threat landscape
• Focus on operational efficiency and cost optimization

${companyName} Specific Insights:
• Companies in this sector are actively modernizing legacy systems
• Increased focus on data analytics and business intelligence
• Remote work infrastructure investments ongoing
• Sustainability and green IT initiatives gaining traction

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPETITIVE ANALYSIS

Primary Competitors Being Evaluated:
${competitorsList}

CDW Competitive Advantages:
• Comprehensive end-to-end solutions across hardware, software, and services
• Deep expertise in multi-cloud environments (AWS, Azure, Google Cloud)
• Strong vendor partnerships with all major technology providers
• Dedicated account teams with vertical industry specialization
• Robust professional services and managed services capabilities
• Proven track record in complex enterprise deployments

Competitive Positioning:
${competitors && competitors.includes('Long View Systems') ? '• Long View Systems: Strong in government sector, less broad commercial reach\n' : ''}${competitors && competitors.includes('TELUS') ? '• TELUS: Telecommunications-focused, limited IT integration services\n' : ''}${competitors && competitors.includes('Softchoice') ? '• Softchoice: Software-centric, less hardware infrastructure depth\n' : ''}${competitors && competitors.includes('Insight Enterprises') ? '• Insight Enterprises: Similar scale, CDW offers stronger services portfolio\n' : ''}${competitors && competitors.includes('Dell Technologies') ? '• Dell Technologies: Hardware vendor, CDW provides vendor-agnostic solutions\n' : ''}
CDW differentiates through our technology-agnostic approach, comprehensive lifecycle services, and ability to orchestrate solutions across multiple vendors.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POTENTIAL PAIN POINTS & OPPORTUNITIES

Common Enterprise Challenges:
• Legacy infrastructure limiting business agility
• Security vulnerabilities and compliance requirements
• Rising IT operational costs
• Skills gaps in emerging technologies
• Complex multi-vendor management
• Data center modernization needs

CDW Solution Opportunities:
• Infrastructure Modernization: Assessment and roadmap for cloud migration
• Security Services: Comprehensive security posture evaluation and enhancement
• Managed Services: Reduce operational burden with CDW managed solutions
• Software Asset Management: Optimize licensing costs and compliance
• Professional Services: Staff augmentation and project delivery expertise
• Workspace Solutions: Modern collaboration and productivity tools

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE LEADERSHIP ENGAGEMENT

Key Stakeholders to Engage:
• CIO/CTO: Strategic technology vision and infrastructure decisions
• CFO: Budget authority and ROI requirements
• CISO: Security strategy and compliance mandates
• VP of IT Operations: Day-to-day infrastructure management
• Procurement/Sourcing: Vendor selection and contract negotiation

Messaging Strategy:
• Emphasize total cost of ownership (TCO) reduction
• Highlight business outcomes over technology features
• Demonstrate industry-specific expertise and case studies
• Showcase CDW's financial strength and stability
• Present flexible engagement models (CAPEX, OPEX, as-a-Service)

Executive Value Proposition:
CDW partners with ${companyName} to accelerate digital transformation, optimize IT investments, and drive business innovation through integrated technology solutions backed by deep expertise and comprehensive lifecycle services.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDED NEXT STEPS

1. Schedule discovery call with key stakeholders
2. Conduct comprehensive IT environment assessment
3. Develop customized solution proposal aligned with business objectives
4. Present ROI analysis and implementation roadmap
5. Arrange technical deep-dive sessions with CDW specialists
6. Provide relevant case studies from similar organizations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For additional insights or to discuss this opportunity, contact your CDW account team.

CDW - The Right Technology. Right Away.`;
}

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
});
