import React from 'react';
// Assuming you have an Owners.css or app.css that includes these styles
// import './Owners.css'; // Uncomment if you prefer a dedicated CSS file
import chrisImage from '../src/assets/me.jpg'; // Example of importing local images
const Owners = () => {
  const ownersData = [
    {
      name: "Fabio Facin",
      title: "Chief Security Officer & Co-Founder",
      image: "https://media.licdn.com/dms/image/v2/D4E03AQEB50qjanVvUw/profile-displayphoto-shrink_400_400/B4EZX3BFH8H0Ag-/0/1743606010671?e=1762992000&v=beta&t=yMxW0U8VajI-NMR9irqlep0c3PqW26yVHbhp4oT_U9c", // Placeholder image, replace with actual owner image
      bio: "Fabio leads LiquidSplit's security architecture, developing end-to-end systems that safeguard user data and transaction integrity. With a background in ethical hacking, backend development, and full-stack engineering, he designs and implements the platform's secure frameworks - from authentication to encryption - ensuring every layer of LiquidSplit is built for trust, performance, and resilience.",
      social: {
        linkedin: "https://www.linkedin.com/in/fabio-facin-a836a6251/",
        
      }
    },
    {
      name: "Chris Carchi",
      title: "Lead Product Engineer & Co-Founder",
      bio: "Chris architects the product experience at LiquidSplit - transforming complex financial logic into intuitive, user-first designs. With a strong foundation in full-stack engineering and product design, he translates user feedback into elegant, scalable solutions that simplify real-world co-ownership transactions.",
      image: chrisImage, // Using imported local image
      social: {
        linkedin: "https://linkedin.com/in/bob"
      }
    },
    {
      name: "Sanchin Noble",
      title: "Chief Technology Officer & Co-Founder",
      image: "https://media.licdn.com/dms/image/v2/D4E03AQEZhfJNp11QzA/profile-displayphoto-scale_400_400/B4EZjIOIkZHoAk-/0/1755705805839?e=1762992000&v=beta&t=Oxa9vSZnbQ7dndlKTcfFeNpLsiDdzKZdMTWPKy5pjIY", // Placeholder image, replace with actual owner image
      bio: "Sanchin leads the technical architecture at LiquidSplit, driving scalable backend systems and high-performance infrastructure. His expertise in blockchain and secure APIs enables seamless, verified payment splitting. He's responsible for ensuring the platform's codebase remains efficient, resilient, and future-ready as the company expands.",
      social: {
        linkedin: "https://linkedin.com/in/charlie",
      }
    },
    {
      name: "Lansina Diakite",
      title: "Chief Network Security Engineer & Co-Founder",
      image: "https://media.licdn.com/dms/image/v2/D4E03AQEyXZEn78WZ0w/profile-displayphoto-scale_400_400/B4EZl5GqaoIIAg-/0/1758673414325?e=1762992000&v=beta&t=Pe5_cxQP7_bTI5SZkzWvBvOUjwdnMr4FUnQzMiTftJI",
      bio: "Lansina specializes in building and securing LiquidSplit's network foundation, ensuring seamless connectivity between core systems and user-facing applications. With experience in network engineering, cybersecurity operations, and system optimization, he bridges infrastructure and development - reinforcing reliability, speed, and protection across the platform.",
      social: {
        linkedin: "https://www.linkedin.com/in/lansina-diakite-7a673b202/",
        
      }
    }
  ];

  return (
    <div className="owners-page-container">
      <header className="owners-hero">
        <h1>Meet the Visionaries Behind LiquidSplit</h1>
        <p className="hero-subtitle">
          We're a team passionate about simplifying shared ownership and strengthening friendships through technology.
        </p>
      </header>

      <section className="owners-grid-section">
        <h2 className="section-title">Our Team</h2>
        <div className="owners-grid">
          {ownersData.map((owner, index) => (
            <div className="owner-card" key={index}>
              <img src={owner.image} alt={owner.name} className="owner-image" />
              <h3>{owner.name}</h3>
              <p className="owner-title">{owner.title}</p>
              <p className="owner-bio">{owner.bio}</p>
              <div className="owner-social">
                {owner.social.linkedin && (
                  <a href={owner.social.linkedin} target="_blank" rel="noopener noreferrer">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" className="social-icon" />
                  </a>
                )}
                {owner.social.twitter && (
                  <a href={owner.social.twitter} target="_blank" rel="noopener noreferrer">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/4f/Twitter-logo.svg" alt="Twitter" className="social-icon" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="product-vision-section">
        <div className="product-description">
          <h2 className="section-title">Our Product: LiquidSplit</h2>
          <p>
            LiquidSplit was born from a simple idea: co-owning items with friends shouldn't be complicated. We observed the friction and awkwardness that often arises when splitting costs for shared assets – from subscription services to major purchases. Our platform provides a secure, transparent, and instant way to divide payments and legally establish ownership shares, ensuring that every transaction strengthens rather than strains relationships.
          </p>
          <p>
            Powered by cutting-edge payment technology and blockchain-backed receipts, LiquidSplit offers peace of mind. No more manual calculations, chasing payments, or ambiguity about who owns what. Just seamless, fair, and documented co-ownership for everyone.
          </p>
        </div>

        <div className="our-vision">
          <h2 className="section-title">Our Vision</h2>
          <p>
            We envision a world where shared ownership is effortless and inclusive. LiquidSplit aims to be the go-to platform for any collective purchase, fostering a culture of collaboration and trust among friends, families, and communities. We believe in empowering individuals to share experiences and assets without financial hurdles, making everything from a shared gaming console to a vacation home easily attainable.
          </p>
          <p>
            Our long-term goal is to expand LiquidSplit's capabilities, integrating with more platforms and offering advanced features for asset management and transfer. We're committed to continuous innovation, driven by our users' needs, to ensure LiquidSplit remains at the forefront of collaborative consumption.
          </p>
        </div>
      </section>
      
      {/* You might want a simple footer here or ensure your main app footer extends */}
    </div>
  );
};

export default Owners;
